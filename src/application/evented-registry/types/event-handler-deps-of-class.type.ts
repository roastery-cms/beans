import type { AnyEventHandlerClass } from "./any-event-handler-class.type";

/**
 * Extracts the `Deps` type from an `IEventHandler` class's `handle()`
 * parameter via `infer`, on the concrete class substituted for
 * `AnyEventHandlerClass`'s `never`-bounded slot — the same "widest
 * structural bound, recover specifics via `infer` later" idiom
 * `DepsOfClass` (`@roastery/beans/application/command-registry/types`)
 * already uses for `Command`.
 *
 * @typeParam Class - The event-handler class to inspect.
 * @see `RegistrableEventHandlerClass` — the only consumer.
 */
export type EventHandlerDepsOfClass<Class extends AnyEventHandlerClass> =
	Class extends {
		readonly prototype: { handle(event: never, deps: infer Deps): unknown };
	}
		? Deps
		: never;
