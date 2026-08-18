import { commandRegistry } from "@/application/command-registry";
import type {
	AnyCommandClass,
	CommandRegistrySpecBase,
	CommandRunner,
} from "@/application/command-registry/types";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { defaultOnError } from "./helpers/default-on-error";
import { reactionCycleError } from "./helpers/cycle-error";
import { nameOf } from "./helpers/name-of";
import type { AnyEventHandlerClass } from "./types/any-event-handler-class.type";
import type { EventedRegistryBuilder } from "./types/evented-registry-builder.type";
import type { EventedRegistryOptions } from "./types/evented-registry-options.type";
import type { IEventedRegistry } from "./types/ievented-registry.interface";
import type { IEventEmitter } from "./types/ievent-emitter.interface";

/**
 * Declares `commandRegistry`, gaining event behaviour: every event a
 * registered command's `CommandResult` carries is automatically published
 * through `emitter`, and reactions registered via `.on(eventClass,
 * handlerClass)` run — `await`ed, isolated from one another and from the
 * command call that raised the event — before that call resolves.
 *
 * Delegates command construction and execution entirely to `commandRegistry`
 * itself (reuse, not reimplementation): `spec`'s actual gating, validation
 * and sibling-command wiring all come from the real `commandRegistry(spec)
 * .withDependencies(dependencies)` call inside. What this function adds is a
 * second bag of the same shape, `commands`, built here (one instance per
 * point in the call chain — see `buildCommands`) and reachable both from
 * `.get()` externally and from every reaction's `deps.commands` — so a
 * reaction that calls `deps.commands.sendReceipt(payload)` runs through the
 * very same decorated runner `.get("sendReceipt")` would, and whatever that
 * command in turn raises is, itself, auto-published and auto-reacted-to.
 * A reaction chain that cycles back to a command key or event name already
 * on its own call chain — a reaction whose triggered command raises the
 * same event again, directly or through further reactions — throws
 * `LoopDetectedException` (508) instead of recursing until the call stack
 * gives out, the same runtime backstop `commandRegistry`'s own sibling
 * composition now has. For a cycle closing on an *event* specifically, that
 * failure is isolated exactly like any other reaction error (routed
 * through `onError`/`defaultOnError`) rather than thrown — it still never
 * rejects the `CommandResult` of the command that raised the event.
 *
 * @typeParam Spec - The command spec, inferred `const` so each key keeps its
 *   exact command class.
 * @param spec - One `Command` subclass per registry key — identical to what
 *   `commandRegistry(spec)` itself takes.
 * @param emitter - Where every raised event is published — see `IEventEmitter`.
 * @param options - `{ onError }` — see `EventedRegistryOptions`.
 * @returns A builder whose `withDependencies` attaches the dependency
 *   record and returns the registry.
 *
 * @example
 * ```ts
 * class SendReceiptOnOrderConfirmed implements IEventHandler<OrderConfirmed, SendReceiptDeps> {
 *   public async handle(event: OrderConfirmed, deps: SendReceiptDeps): Promise<void> {
 *     await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
 *   }
 * }
 *
 * const registry = eventedRegistry(
 *   { confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
 *   emitter,
 *   { onError: (error, { event }) => logger.error(`reaction to ${event.name} failed`, error) },
 * )
 *   .withDependencies({ mailer })
 *   .on(OrderConfirmed, SendReceiptOnOrderConfirmed);
 *
 * // resolves only after OrderConfirmed's reaction (and whatever it triggers) has run
 * const { result } = await registry.get("confirmOrder")({ total: 100 });
 * ```
 *
 * @throws {@link LoopDetectedException} if a reaction chain reached through
 *   `deps.commands` or through a re-raised event calls back into a command
 *   key or event name already on its own call chain.
 * @see `EventedRegistryBuilder`
 * @see `commandRegistry` in `@roastery/beans/application/command-registry` — what this wraps.
 */
export function eventedRegistry<const Spec extends CommandRegistrySpecBase>(
	spec: Spec,
	emitter: IEventEmitter,
	options: EventedRegistryOptions = {},
): EventedRegistryBuilder<Spec> {
	const { onError = defaultOnError } = options;

	return {
		withDependencies<const Dependencies>(
			dependencies: Dependencies,
		): IEventedRegistry<Spec, Dependencies> {
			const baseRegistry = commandRegistry(spec).withDependencies(dependencies);
			const reactions = new Map<string, AnyEventHandlerClass[]>();

			// The evented registry's own sibling-commands bag, for one point in
			// a call chain — separate from (and unreachable from) the one
			// `commandRegistry` builds internally for its own `Deps.commands`,
			// see the function doc for why this duplication is unavoidable
			// rather than reused. Rebuilt fresh per chain rather than shared as
			// one flat, mutable bag, for the same concurrency reason
			// `command-registry.ts`'s own `buildCommands` now is: a shared
			// mutable guard can't tell two unrelated concurrent calls to the
			// same key apart from a real cycle.
			function buildCommands(
				chain: ReadonlySet<string>,
			): Record<string, CommandRunner<AnyCommandClass>> {
				const commands: Record<string, CommandRunner<AnyCommandClass>> = {};

				for (const key of Object.keys(spec)) {
					const node = `command:${key}`;
					const run = baseRegistry.get(key as never);

					commands[key] = async (payload) => {
						if (chain.has(node)) throw reactionCycleError([...chain, node]);

						const nextChain = new Set(chain).add(node);
						const outcome = await run(payload);

						for (const event of outcome.events) {
							await emitter.emit(event);
							await react(event, nextChain);
						}

						return outcome;
					};
				}

				return commands;
			}

			async function react(
				event: IDomainEvent,
				chain: ReadonlySet<string>,
			): Promise<void> {
				const node = `event:${event.name}`;

				// A cycle closing back to an event already on this chain is
				// isolated exactly like any other reaction failure below — one
				// `onError` call, never a throw that would reject the
				// `CommandResult` of the command that raised the original event —
				// so it gets the same treatment before any handler for this
				// (re-)raised event runs at all.
				if (chain.has(node)) {
					try {
						await onError(reactionCycleError([...chain, node]), { event });
					} catch (hookError) {
						defaultOnError(hookError);
					}
					return;
				}

				const nextChain = new Set(chain).add(node);

				// Snapshot, not a live reference: a reaction that itself registers
				// a new handler for this same event name must not change the list
				// this dispatch is already iterating.
				const handlerClasses = [...(reactions.get(event.name) ?? [])];
				// Pragmatic cast — same spirit as `command-registry.ts`'s own: a
				// handler's declared `Deps` is checked structurally at `.on()` time
				// (`RegistrableEventHandlerClass`), so nothing here needs to prove it
				// again at runtime.
				const handlerDeps = {
					...(dependencies as object),
					commands: buildCommands(nextChain),
				} as never;

				for (const HandlerClass of handlerClasses) {
					try {
						// Pragmatic cast on `event`, same reason `handlerDeps` already
						// needs one: `AnyEventHandlerClass`'s `handle` is bounded by
						// `never` in both slots (the same widest-contravariant-bound
						// idiom `AnyCommandClass` uses), and a concrete `HandlerClass`
						// was already checked against `Event` at `.on()` time via
						// `RegistrableEventHandlerClass`.
						await new HandlerClass().handle(event as never, handlerDeps);
					} catch (error) {
						try {
							await onError(error, { event });
						} catch (hookError) {
							// The hook itself failed — nowhere left to escalate to
							// without giving up isolation, so this one failure falls
							// back to the unconditional default regardless of what
							// `onError` was configured to.
							defaultOnError(hookError);
						}
					}
				}
			}

			const commands = buildCommands(new Set());

			const self: IEventedRegistry<Spec, Dependencies> = {
				get(key) {
					if (!Object.hasOwn(spec, key))
						throw new InvalidPropertyException(String(key), "evented-registry");

					return commands[key as string] as never;
				},

				on(eventClass, handlerClass) {
					const name = nameOf(eventClass);
					const existing = reactions.get(name) ?? [];

					existing.push(handlerClass as never);
					reactions.set(name, existing);

					return self;
				},
			};

			return self;
		},
	};
}
