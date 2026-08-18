import type { AnyEventHandlerClass } from "./any-event-handler-class.type";

/**
 * Extracts the `Event` type from an `IEventHandler` class's `handle()`
 * parameter via `infer`, mirroring `EventHandlerDepsOfClass` but reading the
 * first parameter instead of the second.
 *
 * @typeParam Class - The event-handler class to inspect.
 * @see `RegistrableEventHandlerClass` — the only consumer.
 */
export type EventHandlerEventOfClass<Class extends AnyEventHandlerClass> =
	Class extends {
		readonly prototype: { handle(event: infer Event, deps: never): unknown };
	}
		? Event
		: never;
