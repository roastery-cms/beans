import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { isTransactional } from "@/application/command/decorators/helpers/is-transactional";
import type {
	AnyCommandClass,
	CommandResult,
	CommandRunner,
	CommandsSpecBase,
} from "@/application/command/types";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { cycleError } from "./helpers/cycle-error";
import { defaultOnError } from "./helpers/default-on-error";
import { installRunners } from "./helpers/install-runners";
import { nameOf } from "./helpers/name-of";
import type { AnyEventHandlerClass } from "./types/any-event-handler-class.type";
import type { CommandsBuilder } from "./types/commands-builder.type";
import type { CommandsOf } from "./types/commands-of.type";
import type { CommandsOptions } from "./types/commands-options.type";
import type { EventedCommandsBuilder } from "./types/evented-commands-builder.type";
import type { EventedCommandsOptions } from "./types/evented-commands-options.type";
import type { EventedCommandsOf } from "./types/evented-commands-of.type";

/**
 * Events dammed up while a transaction boundary is open above the command
 * that raised them, each paired with the call chain it was raised on.
 *
 * The chain travels with the event because `react` needs the position the
 * event was raised at, not the position it is finally published from — the
 * cycle guard would otherwise see a chain that no longer matches where the
 * reaction actually sits.
 *
 * Internal to `commands`: a `pending` of `undefined` is what says "no
 * boundary is open above me", so the parameter carries the flag and the
 * payload as one value instead of two that could fall out of sync.
 */
type PendingPublication = {
	readonly chain: ReadonlySet<string>;
	readonly event: IDomainEvent;
}[];

/**
 * Declares a registry gating access to a set of `Command` subclasses by
 * their declared dependencies — entirely at compile time — and, given an
 * `emitter`, publishing every event those commands raise and running the
 * reactions registered through `.on()`.
 *
 * Two-phase for the same reason `blueprint` is: `spec` is fixed by this call
 * before `withDependencies`'s `Dependencies` can be checked against every
 * spec member's `Deps`.
 *
 * @remarks
 * `emitter` is required *inside* `options` on purpose. It is what separates
 * this overload from the events-free one below, and it makes
 * `commands(spec, { onError })` — asking for reaction isolation without
 * having any reactions — a compile error instead of a registry that quietly
 * has no `.on()`. A caller whose emitter only sometimes exists branches at
 * the call site: `emitter ? commands(spec, { emitter }) : commands(spec)`.
 *
 * This overload is declared **first** so that overload resolution reads the
 * options object the way a human does: `{ emitter, … }` matches here and
 * gains `.on()`, while `{ transaction }` alone cannot (no `emitter`) and
 * falls through to the events-free overload. Ordering them the other way
 * round would hand an options object carrying both back as a registry with
 * no `.on()` at all.
 *
 * Neither overload accepts `{}`, and that is what keeps the feature
 * discoverable. TypeScript computes an argument's completions from the
 * overload that *matches*: an empty literal matching the events-free one
 * would offer `transaction` and hide `emitter`/`onError` from the editor
 * completely. Matching neither makes the completion list the union of both —
 * so opening the brace shows all three keys, and typing one of them narrows
 * to whatever is still available.
 *
 * A reaction chain that cycles back to a command key or event name already
 * on its own call chain — a reaction whose triggered command raises the same
 * event again, directly or through further reactions — throws
 * `LoopDetectedException` (508) instead of recursing until the call stack
 * gives out. For a cycle closing on an *event* specifically, that failure is
 * isolated exactly like any other reaction error (routed through
 * `onError`/`defaultOnError`) rather than thrown — it still never rejects
 * the `CommandResult` of the command that raised the event.
 *
 * @typeParam Spec - The command spec, inferred `const` so each key keeps its
 *   exact command class (not widened to {@link AnyCommandClass}).
 * @param spec - One `Command` subclass per registry key.
 * @param options - `{ emitter, onError?, transaction? }` — see
 *   {@link EventedCommandsOptions}.
 * @returns A builder whose `withDependencies` attaches the dependency record
 *   and returns the registry, `.on()` included.
 *
 * @example
 * ```ts
 * class SendReceiptOnOrderConfirmed implements IEventHandler<OrderConfirmed, SendReceiptDeps> {
 *   public async handle(event: OrderConfirmed, deps: SendReceiptDeps): Promise<void> {
 *     await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
 *   }
 * }
 *
 * const registry = commands(
 *   { confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
 *   { emitter, onError: (error, { event }) => logger.error(`reaction to ${event.name} failed`, error) },
 * )
 *   .withDependencies({ mailer })
 *   .on(OrderConfirmed, SendReceiptOnOrderConfirmed);
 *
 * // resolves only after OrderConfirmed's reaction (and whatever it triggers) has run
 * const { result } = await registry.confirmOrder({ total: 100 });
 * ```
 *
 * @throws `PropertyNameCollisionException` — from `withDependencies`, when a
 *   spec key collides with a member the registry already carries (`get`, `on`).
 * @throws `InvalidPropertyException` — from `.get()`, for a key the spec
 *   does not carry.
 * @throws `LoopDetectedException` if a chain reached through `deps.commands`
 *   or through a re-raised event calls back into a command key already on
 *   its own call chain.
 * @see `EventedCommandsBuilder`
 */
export function commands<const Spec extends CommandsSpecBase>(
	spec: Spec,
	options: EventedCommandsOptions,
): EventedCommandsBuilder<Spec>;

/**
 * The same registry without any event behaviour: a `CommandResult` still
 * carries whatever an aggregate raised, there is simply nowhere for it to be
 * published to, and `.on()` does not exist.
 *
 * `options` is still accepted here for what is orthogonal to a bus — today
 * that is `transaction`, so a registry can open a boundary around its
 * `transactional` commands long before it has anywhere to publish. Moving up
 * to the evented overload later is one added key.
 *
 * `transaction` is **required inside** `options` (see {@link CommandsOptions}):
 * an options object with nothing in it is `commands(spec)` written the long
 * way, and accepting it would cost the editor's completion list. A caller
 * whose boundary only sometimes exists branches at the call site, exactly as
 * one whose emitter does.
 *
 * @typeParam Spec - The command spec, inferred `const` so each key keeps its
 *   exact command class (not widened to {@link AnyCommandClass}).
 * @param spec - One `Command` subclass per registry key.
 * @param options - `{ transaction? }` — see {@link CommandsOptions}.
 * @returns A builder whose `withDependencies` attaches the dependency record
 *   and returns the registry.
 *
 * @example
 * ```ts
 * const registry = commands({
 *   login: UserLoginCommand,
 *   updateUser: UpdateUserCommand, // Deps names `commands: { login: CommandRunner<typeof UserLoginCommand> }`
 * }).withDependencies({ secrets, users });
 *
 * const { result, events } = await registry.updateUser(payload);
 * // ^ internally calls deps.commands.login(...) — see `SiblingCommands`
 *
 * const key = "updateUser" as const; // held in a variable: .get() is the way out
 * await registry.get(key)(payload);
 * ```
 *
 * @throws `PropertyNameCollisionException` — from `withDependencies`, when a
 *   spec key collides with a member the registry already carries (`get`).
 * @throws `InvalidPropertyException` — from `.get()`, for a key the spec
 *   does not carry.
 * @throws `LoopDetectedException` if a sibling-command chain reached through
 *   `deps.commands` calls back into a key already on its own call chain.
 * @see `CommandsBuilder`
 */
export function commands<const Spec extends CommandsSpecBase>(
	spec: Spec,
	options?: CommandsOptions,
): CommandsBuilder<Spec>;

export function commands<const Spec extends CommandsSpecBase>(
	spec: Spec,
	options?: Partial<EventedCommandsOptions>,
): CommandsBuilder<Spec> | EventedCommandsBuilder<Spec> {
	const { emitter, onError = defaultOnError, transaction } = options ?? {};

	return {
		withDependencies<const Dependencies>(
			dependencies: Dependencies,
		): CommandsOf<Spec, Dependencies> & EventedCommandsOf<Spec, Dependencies> {
			const reactions = new Map<string, AnyEventHandlerClass[]>();

			/**
			 * Builds the sibling-commands bag for one point in a call chain.
			 *
			 * Rebuilt fresh for every nested call rather than shared as one flat,
			 * mutable object: a shared `Set` guard (add before await, remove in
			 * `finally`) cannot tell two unrelated *concurrent* calls to the same
			 * key apart from a real cycle — the second call would see the first
			 * call's in-flight marker and misreport a cycle that never happened.
			 * Threading an immutable `chain` downward instead means two sibling
			 * branches (two different reactions calling the same command
			 * independently, say) never see each other's markers, only true
			 * ancestors do — the same "siblings, not a cycle" distinction
			 * `domain/entity`'s own blueprint-cycle guard already draws.
			 *
			 * There is exactly **one** bag, and every path reaches it: `.get()`,
			 * the direct accessors, a command's own `deps.commands` and a
			 * reaction's. A command dispatched from inside another command
			 * therefore publishes and reacts exactly as one dispatched from
			 * outside — the two parallel bags this pillar used to keep (one
			 * decorated, one not) were an asymmetry no caller could see, and the
			 * events of a nested command reached no emitter at all.
			 */
			function buildCommands(
				chain: ReadonlySet<string>,
				pending: PendingPublication | undefined,
			): Record<string, CommandRunner<AnyCommandClass>> {
				const runners: Record<string, CommandRunner<AnyCommandClass>> = {};

				for (const key of Object.keys(spec)) {
					// Pragmatic cast — same spirit as buildProperty/readDefinition in
					// entity.ts: TypeScript doesn't correlate a generic Spec key with
					// the concrete payload/deps the body needs here.
					const CommandClass = spec[key] as AnyCommandClass;
					const node = `command:${key}`;

					// Resolved once per bag rather than per call: the marker is a
					// static on a class that cannot change between dispatches, and
					// `pending` is fixed for the whole bag.
					//
					// A boundary is opened only at the **outermost** marked command.
					// One already open is inherited by everything below it, so the
					// runner never has to be reentrant and one business operation
					// stays one transaction — the trap that kept this out of
					// `Command.execute()` itself, where every nested dispatch would
					// have opened a second one and an inner rollback would never have
					// reached the outer.
					//
					// `transaction !== undefined` is part of the test on purpose: a
					// marked command in a registry with no runner must run exactly as
					// it would unmarked, which means it must not dam up its children's
					// events either.
					const opensBoundary =
						transaction !== undefined &&
						pending === undefined &&
						isTransactional(CommandClass);

					runners[key] = async (payload) => {
						if (chain.has(node)) throw cycleError([...chain, node]);

						const nextChain = new Set(chain).add(node);

						// Construction stays outside the boundary: it only validates
						// the payload, and a `BadRequestException` is not worth a
						// BEGIN/ROLLBACK round-trip.
						const command = new CommandClass(payload);

						// The bag handed downward carries the collector this operation
						// publishes through. Opening a boundary starts a fresh one;
						// anything below an open boundary keeps filling the one above;
						// with no boundary in sight it stays `undefined`, and every
						// runner publishes as soon as it resolves — unchanged.
						const collected: PendingPublication | undefined = opensBoundary
							? []
							: pending;

						const work = (): Promise<CommandResult<unknown>> =>
							command.execute({
								...dependencies,
								commands: buildCommands(nextChain, collected),
							} as never);

						const outcome = opensBoundary
							? await transaction(work)
							: await work();

						// A boundary is open above: hand the events up and publish
						// nothing. Publishing here would put them *inside* someone
						// else's transaction, which is the one thing the boundary
						// exists to prevent.
						if (pending) {
							for (const event of outcome.events)
								pending.push({ chain: nextChain, event });

							return outcome;
						}

						// Nothing open above — this is the point where the order
						// COMMIT → emit → react is actually true, at every depth. The
						// collected events go first because they happened first.
						for (const entry of collected ?? [])
							await publish(entry.event, entry.chain);

						for (const event of outcome.events) await publish(event, nextChain);

						return outcome;
					};
				}

				return runners;
			}

			/**
			 * Publishes one event and runs its reactions, in that order.
			 *
			 * Only ever called with every boundary already closed, which is what
			 * makes `COMMIT` → `emit` → react hold for a nested command as much as
			 * for the one that opened the transaction.
			 */
			async function publish(
				event: IDomainEvent,
				chain: ReadonlySet<string>,
			): Promise<void> {
				try {
					await emitter?.emit(event);
				} catch (error) {
					// The command already committed. Rejecting its `CommandResult`
					// would report failure for an operation that succeeded, and the
					// natural response to that error is to retry — applying the whole
					// thing twice. A bus that is down loses the event instead, which
					// is the limit an outbox exists to close and which this package
					// already documents. Same isolation a throwing reaction gets,
					// for the same reason.
					try {
						await onError(error, { event });
					} catch (hookError) {
						defaultOnError(hookError);
					}
				}

				// Reactions run even when the external bus failed: they are internal
				// to the registry and never depended on it.
				await react(event, chain);
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
						await onError(cycleError([...chain, node]), { event });
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

				if (handlerClasses.length === 0) return;

				// Pragmatic cast — same spirit as `buildCommands`'s own: a handler's
				// declared `Deps` is checked structurally at `.on()` time
				// (`RegistrableEventHandlerClass`), so nothing here needs to prove it
				// again at runtime.
				// `undefined`, never the caller's collector: a reaction only ever
				// runs once every boundary has closed, so a command it dispatches
				// opens its own — and rightly so, since a reaction must not be able
				// to roll back what already committed. Publication being deferred to
				// the outermost runner is what makes that unconditionally true; it
				// used to be asserted by a hard-coded `false` that a nested command's
				// events could contradict.
				const handlerDeps = {
					...(dependencies as object),
					commands: buildCommands(nextChain, undefined),
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

			const runners = buildCommands(new Set(), undefined);

			const self = {
				get(key: string) {
					if (!Object.hasOwn(spec, key))
						throw new InvalidPropertyException(String(key), "commands");

					return runners[key];
				},
			};

			// `.on()` exists only when there is an emitter to publish through —
			// the two overloads say so at the type level, and this is the runtime
			// half of the same statement: without one, `"on" in registry` is
			// false, so a spec key *called* `on` stays installable. The test is
			// `emitter`, not `options`: `commands(spec, { transaction })` takes
			// options and still has no bus, so it must stay on the events-free
			// side of this line.
			if (emitter)
				Object.defineProperty(self, "on", {
					configurable: false,
					enumerable: true,
					writable: false,
					value(eventClass: never, handlerClass: never) {
						const name = nameOf(eventClass);
						const existing = reactions.get(name) ?? [];

						existing.push(handlerClass);
						reactions.set(name, existing);

						return self;
					},
				});

			// Installed on `self` itself, before it is handed out, so the identity
			// `.on()` returns carries the accessors too.
			installRunners(self, spec, runners);

			// Pragmatic cast: the accessors are installed reflectively, so
			// TypeScript cannot see them on the object literal, and `get`/`on`'s
			// generic key/return correlations are not something a plain method
			// can carry either.
			return self as unknown as CommandsOf<Spec, Dependencies> &
				EventedCommandsOf<Spec, Dependencies>;
		},
	};
}
