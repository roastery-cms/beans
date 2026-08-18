import type { DomainEvent } from "@/domain/domain-event";
import type { EventHandlerClassOf } from "./types/event-handler-class-of.type";
import type { IEventHandler } from "./types/ievent-handler.interface";

/**
 * Builds an `IEventHandler` **class** from just its `handle` logic — the
 * practical shortcut for the common case where a reaction is exactly one
 * function and nothing else, without writing a whole
 * `implements IEventHandler<Event, Deps>` class for it.
 *
 * The generated class's `handle` delegates straight to the given function,
 * forwarding `event` and `deps` unchanged and returning its `Promise<void>`
 * as-is — no `try`/`catch` of its own, so a rejection propagates exactly as
 * it would from a hand-written class's `handle`. That is what lets
 * `eventedRegistry`'s existing per-reaction isolation (the optional
 * `onError` hook, or its microtask re-throw fallback — see
 * `helpers/default-on-error.ts`) treat a generated handler exactly like one
 * written by hand: nothing in `eventedRegistry` itself needed to change.
 * The generated class also satisfies `AnyEventHandlerClass`
 * (`./types/any-event-handler-class.type`) the same way any hand-written
 * `IEventHandler` implementation does — a zero-argument constructor,
 * constructed fresh (`new HandlerClass()`) per matching event by
 * `eventedRegistry` itself — so it is directly usable with
 * `IEventedRegistry.on(eventClass, GeneratedHandlerClass)`, gated by the
 * exact same `RegistrableEventHandlerClass` compile-time check a
 * hand-written class already goes through.
 *
 * `name` is optional and purely cosmetic — unlike `defineDomainEvent`'s own
 * `name` argument, which doubles as the event's wire-level `defineName()`,
 * nothing here reads the generated class's `.name` at runtime: matching in
 * `eventedRegistry` is keyed off the *event* class's name (`nameOf`),
 * never the handler's. It exists only for readability — stack traces,
 * `console.log`, debuggers, and any DI/observability tooling that inspects
 * `handlerClass.name` — the same `if (name) Object.defineProperty(...)`
 * pattern `defineValueObject` already uses, for the same reason. Left
 * unset, the generated class stays named `GeneratedEventHandler`.
 *
 * **Call this at module scope, once** — the same rule `defineDomainEvent`
 * and the custom value-object factories already document. Each call mints
 * a fresh class, so two calls with the same `handle` function produce
 * unrelated classes and `instanceof` does not relate them.
 *
 * @typeParam Event - The concrete event type this handler reacts to — an
 *   **instance** type (`OrderConfirmed`), never a class reference. See
 *   {@link IEventHandler}'s own `@typeParam Event` for the
 *   `defineDomainEvent`-generated-event trap (`InstanceType<typeof …>`)
 *   this inherits unchanged.
 * @typeParam Deps - The dependencies `handle` needs.
 *
 * @param handle - The reaction itself: `(event, deps) => Promise<void>`,
 *   run once per matching event. Must resolve `Promise<void>` — the same
 *   fixed return `IEventHandler.handle` itself declares, never
 *   `void | Promise<void>`.
 * @param name - Optional name to stamp onto the generated class, for
 *   readability in stack traces and tooling. Has no effect on matching or
 *   registration.
 * @returns The generated `IEventHandler<Event, Deps>` class, ready for
 *   `IEventedRegistry.on(eventClass, ...)`.
 *
 * @see {@link EventHandlerClassOf} — the returned shape.
 * @see {@link IEventHandler} — the contract the generated class implements.
 * @see `IEventedRegistry.on` in `./types/ievented-registry.interface` — where the generated class is registered.
 * @see `defineDomainEvent` in `@roastery/beans/domain/domain-event` — the sibling factory this idiom is borrowed from.
 *
 * @example
 * ```ts
 * type SendReceiptDeps = { commands: { sendReceipt: CommandRunner<typeof SendReceiptCommand> } };
 *
 * const SendReceiptOnOrderConfirmed = defineEventHandler<OrderConfirmed, SendReceiptDeps>(
 *   async (event, deps) => {
 *     await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
 *   },
 * );
 *
 * const registry = eventedRegistry(spec, emitter)
 *   .withDependencies({ commands })
 *   .on(OrderConfirmed, SendReceiptOnOrderConfirmed);
 * ```
 */
export function defineEventHandler<Event extends DomainEvent, Deps>(
	handle: (event: Event, deps: Deps) => Promise<void>,
	name?: string,
): EventHandlerClassOf<Event, Deps> {
	class GeneratedEventHandler implements IEventHandler<Event, Deps> {
		public handle(event: Event, deps: Deps): Promise<void> {
			return handle(event, deps);
		}
	}

	if (name)
		Object.defineProperty(GeneratedEventHandler, "name", {
			configurable: true,
			value: name,
		});

	// The cast covers the same gap `defineDomainEvent`/`defineValueObject`
	// cover with their own casts: TypeScript can't prove on its own that the
	// class declared above satisfies the public alias, only that it
	// satisfies `IEventHandler<Event, Deps>`.
	return GeneratedEventHandler as EventHandlerClassOf<Event, Deps>;
}
