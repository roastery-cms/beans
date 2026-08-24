import type { CommandsSpecBase } from "@/application/command/types";
import type { ICommands } from "./icommands.interface";
import type { DomainEvent } from "@/domain/domain-event";
import type { AnyEventHandlerClass } from "./any-event-handler-class.type";
import type { EventClassOf } from "./event-class-of.type";
import type { EventedCommandsOf } from "./evented-commands-of.type";
import type { RegistrableEventHandlerClass } from "./registrable-event-handler-class.type";

/**
 * The **named** members of a finished registry that was given an emitter:
 * everything `ICommands` itself offers through `.get()` (publishing every
 * raised event and running its reactions before resolving), plus `.on()` to
 * register those reactions, fluently.
 *
 * @remarks
 * Only half of what `withDependencies` returns — the per-key accessors are a
 * mapped type an interface cannot declare, and are intersected in by
 * {@link EventedCommandsOf}, which is also what `.on()` gives back so a
 * chained `.on(...).on(...)` never loses them.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `commands` — the only producer, through its `options` overload.
 */
export interface IEventedCommands<Spec extends CommandsSpecBase, Dependencies>
	extends ICommands<Spec, Dependencies> {
	/**
	 * Registers a reaction to every event `eventClass` produces — matched by
	 * `name` (resolved from `eventClass` once, here, via `nameOf`), since a
	 * raised event is never `instanceof` the class it was built from
	 * (`Entity.raiseEvent` spreads it into a plain object before buffering
	 * it). Chains — `.on(A, H1).on(B, H2)` — and more than one handler may be
	 * registered for the same event; all run, each isolated from the others.
	 *
	 * `handlerClass` is gated at compile time by `RegistrableEventHandlerClass`:
	 * only a class whose declared `Deps` is structurally satisfied by what
	 * this registry actually has available (its `Dependencies`, plus the
	 * one-hop `commands` bag every handler's `deps.commands` carries) is
	 * accepted — passing an incompatible class is a compile error, not a
	 * runtime surprise.
	 *
	 * @typeParam Event - The concrete event class's instance type, inferred
	 *   from `eventClass`.
	 * @typeParam HandlerClass - The candidate handler class, inferred from
	 *   `handlerClass` before the gate resolves it to itself or `never`.
	 * @param eventClass - The event class to react to, e.g. `OrderConfirmed`.
	 * @param handlerClass - An `IEventHandler<Event, Deps>`-implementing
	 *   class — constructed fresh (`new HandlerClass()`) per matching event.
	 * @returns This registry — the same identity, accessors included — for
	 *   chaining further `.on()` calls.
	 * @throws `InvalidEntityDefinitionException` — when `eventClass` does not
	 *   declare `defineName()` as a prototype method.
	 */
	on<Event extends DomainEvent, HandlerClass extends AnyEventHandlerClass>(
		eventClass: EventClassOf<Event>,
		handlerClass: RegistrableEventHandlerClass<
			Spec,
			Dependencies,
			Event,
			HandlerClass
		>,
	): EventedCommandsOf<Spec, Dependencies>;
}
