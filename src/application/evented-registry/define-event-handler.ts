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
 * **Two overloads, one implementation** — the package's first use of TS
 * function overloading. `IEventHandler`'s own `@typeParam Event` docs the
 * trap the second overload (below) exists to remove: a
 * `defineDomainEvent`-generated event's only name in scope is the generated
 * *class* (`const BeanPlanted = defineDomainEvent(...)`), so `typeof
 * BeanPlanted` names the class shape, not the event — passing it where an
 * instance type is expected fails with TS2344, and `InstanceType<typeof
 * BeanPlanted>` was the only way out. The second overload lets the class go
 * in directly: `defineEventHandler<typeof BeanPlanted, Deps>(...)` resolves
 * `event`'s type by computing `InstanceType<EventClass>` *forward*, from
 * the explicit type argument, no inversion needed.
 *
 * A single generic parameter with a conditional type in `handle`'s position
 * (`EventOf<EventOrClass>`) was tried and rejected: TS cannot infer a type
 * argument that only appears wrapped in a conditional, so a call with no
 * explicit type arguments (this pillar's own tests rely on that) would stop
 * inferring anything useful. Two overloads sidestep that, but **order is
 * load-bearing, not stylistic**: this first overload's `Event` appears
 * *naked* in `handle`'s parameter position, so it is always tried first and
 * always infers cleanly — from an annotated callback parameter, or (with no
 * signal to infer from at all, an unannotated zero-parameter callback) from
 * its own explicit default. The class-reference overload's `EventClass`
 * appears only inside `InstanceType<EventClass>`, a wrapped position — with
 * nothing to infer from, that produces `any` instead of falling back to a
 * sane default, so it must never be the first overload tried. Putting it
 * second is safe precisely because a class reference structurally fails
 * *this* overload's `Event extends DomainEvent` constraint (a constructor
 * value has no `occurredAt`/`aggregateId`/`defineName`), so TS always moves
 * on to the second overload for that call shape, and only for that shape.
 *
 * @typeParam Event - The concrete event type this handler reacts to — an
 *   instance type (`OrderConfirmed`, or inferred straight from `handle`'s
 *   own parameter annotation with no explicit type argument). Defaults to
 *   `DomainEvent` — the widest type, correct for a handler that doesn't
 *   read anything off the event at all (e.g. one that only throws, to
 *   exercise error isolation) and is registered against a specific event
 *   class via `.on()` regardless.
 * @typeParam Deps - The dependencies `handle` needs. Defaults to
 *   `unknown`, not `void`: `RegistrableEventHandlerClass` gates `.on()` by
 *   checking that what `eventedRegistry` actually has available
 *   *extends* what the handler declares it needs, and only `unknown` — the
 *   type everything extends — is satisfied unconditionally regardless of
 *   what the registry supplies; `void` would reject every registration,
 *   since an object of real dependencies never extends `void`. `Command`'s
 *   own `Deps = void` idiom does not transfer here — its gate
 *   (`RegistrableKeys`) special-cases `void` and `unknown` as equivalent
 *   "reads nothing" outcomes, but `RegistrableEventHandlerClass` has no
 *   such second branch. Omit the second type argument and `handle`'s
 *   second parameter when a reaction reads nothing from `deps`.
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
 * const SendReceiptOnOrderConfirmed = defineEventHandler<OrderConfirmed, SendReceiptDeps>(
 *   async (event, deps) => {
 *     await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
 *   },
 * );
 * ```
 */
export function defineEventHandler<
	Event extends DomainEvent = DomainEvent,
	Deps = unknown,
>(
	handle: (event: Event, deps: Deps) => Promise<void>,
	name?: string,
): EventHandlerClassOf<Event, Deps>;
/**
 * Overload for a `DomainEvent` **class reference** (`typeof BeanPlanted`,
 * the value `defineDomainEvent` or a hand-written subclass' declaration
 * gives you) — the recommended form for a `defineDomainEvent`-generated
 * event, and the one that removes the `InstanceType<...>` boilerplate.
 * `event` inside `handle` is typed `InstanceType<EventClass>`, computed
 * from this argument, so the concrete event's own payload fields (if any)
 * are still fully visible. Only reached when the first overload's `Event
 * extends DomainEvent` constraint rejects the argument — see the first
 * overload's own doc for why the order between the two is load-bearing.
 *
 * @typeParam EventClass - The event's class, not an instance of it.
 * @typeParam Deps - The dependencies `handle` needs. Defaults to
 *   `unknown` — see the first overload's own `@typeParam Deps` for why.
 *
 * @param handle - The reaction itself.
 * @param name - Optional name to stamp onto the generated class.
 * @returns The generated `IEventHandler<InstanceType<EventClass>, Deps>` class.
 *
 * @example
 * ```ts
 * const BeanPlanted = defineDomainEvent("bean.planted");
 *
 * const LogBeanPlanted = defineEventHandler<typeof BeanPlanted>(async (event) => {
 *   console.log(`bean planted: ${event.aggregateId}`); // no InstanceType<...> needed
 * });
 * ```
 */
export function defineEventHandler<
	EventClass extends abstract new (
		...args: never[]
	) => DomainEvent,
	Deps = unknown,
>(
	handle: (event: InstanceType<EventClass>, deps: Deps) => Promise<void>,
	name?: string,
): EventHandlerClassOf<InstanceType<EventClass>, Deps>;
export function defineEventHandler(
	handle: (event: DomainEvent, deps: unknown) => Promise<void>,
	name?: string,
): EventHandlerClassOf<DomainEvent, unknown> {
	class GeneratedEventHandler implements IEventHandler<DomainEvent, unknown> {
		public handle(event: DomainEvent, deps: unknown): Promise<void> {
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
	// class declared above satisfies either overload's public alias, only
	// that it satisfies the widened implementation signature.
	return GeneratedEventHandler as EventHandlerClassOf<DomainEvent, unknown>;
}
