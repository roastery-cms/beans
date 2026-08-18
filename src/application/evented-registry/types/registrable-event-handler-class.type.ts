import type { CommandRegistrySpecBase } from "@/application/command-registry/types";
import type { AugmentedDependencies } from "@/application/command-registry/types/augmented-dependencies.type";
import type { DomainEvent } from "@/domain/domain-event";
import type { AnyEventHandlerClass } from "./any-event-handler-class.type";
import type { EventHandlerDepsOfClass } from "./event-handler-deps-of-class.type";
import type { EventHandlerEventOfClass } from "./event-handler-event-of-class.type";

/**
 * `HandlerClass` itself, when it is safe to register for `Event` — or
 * `never` when it is not, which is what makes passing an incompatible class
 * to `.on()` a compile error instead of a runtime surprise.
 *
 * Two checks, both load-bearing:
 * - `Event extends EventHandlerEventOfClass<HandlerClass>` — the class's own
 *   declared event parameter must be assignable *from* the concrete `Event`
 *   `eventClass` describes (ordinary function-parameter contravariance: a
 *   `handle(event: DomainEvent, …)` can be called with any `DomainEvent`
 *   subclass instance, so a handler is allowed to declare a wider parameter
 *   than the specific event it is registered for).
 * - `AugmentedDependencies<Spec, Dependencies> extends EventHandlerDepsOfClass<HandlerClass>`
 *   — the same direction `RegistrableKeys` already checks for `Command`:
 *   what `eventedRegistry` actually has available (the raw `Dependencies`
 *   plus the one-hop `commands` bag) must structurally satisfy whatever the
 *   handler declares it needs, not the other way around.
 *
 * Unlike `RegistrableKeys`, there is no finite, known-upfront set of
 * candidate classes to map over and collapse into a union — `.on()` is
 * fluent, one class at a time — so this is a conditional type applied
 * directly to the parameter position instead. Same one-hop limitation as
 * `SiblingCommands`/`RegistrableKeys`: TypeScript cannot prove a fixpoint of
 * arbitrary composition depth, only what `AugmentedDependencies` already
 * proves for a directly-registrable sibling command.
 *
 * @typeParam Spec - The wrapped registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @typeParam Event - The concrete event class's instance type, from `eventClass`.
 * @typeParam HandlerClass - The candidate handler class passed to `.on()`.
 * @see `IEventedRegistry.on` — the only consumer.
 */
export type RegistrableEventHandlerClass<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
	Event extends DomainEvent,
	HandlerClass extends AnyEventHandlerClass,
> =
	Event extends EventHandlerEventOfClass<HandlerClass>
		? AugmentedDependencies<
				Spec,
				Dependencies
			> extends EventHandlerDepsOfClass<HandlerClass>
			? HandlerClass
			: never
		: never;
