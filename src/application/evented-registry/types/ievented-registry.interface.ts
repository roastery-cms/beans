import type {
	CommandRegistrySpecBase,
	ICommandRegistry,
} from "@/application/command-registry/types";
import type { DomainEvent } from "@/domain/domain-event";
import type { AnyEventHandlerClass } from "./any-event-handler-class.type";
import type { EventClassOf } from "./event-class-of.type";
import type { RegistrableEventHandlerClass } from "./registrable-event-handler-class.type";

/**
 * What `eventedRegistry(spec, emitter).withDependencies(dependencies)`
 * returns: everything `ICommandRegistry` itself offers through `.get()`
 * (decorated to auto-publish every raised event and run its reactions
 * before resolving), plus `.on()` to register those reactions, fluently.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `eventedRegistry` — the only producer.
 */
export interface IEventedRegistry<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> extends ICommandRegistry<Spec, Dependencies> {
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
	 * @returns This registry, for chaining further `.on()` calls.
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
	): IEventedRegistry<Spec, Dependencies>;
}
