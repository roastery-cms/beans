import type { BareDomainEventClass } from "../types/bare-domain-event-class.type";
import type { EntityErrorEventFactory } from "../types/entity-error-event-factory.type";

/**
 * Wraps a payload-less bare event-class reference into an
 * {@link EntityErrorEventFactory} — the same `new event(aggregateId)`
 * construction `Entity.raiseEvent` itself performs for the other four
 * decorators, lifted into the factory shape `onError` needs. The caught
 * error is ignored; every call builds a fresh instance of `event`, with a
 * placeholder `aggregateId` (`raiseEvent` overwrites it regardless of what
 * the factory built).
 *
 * `onError` already reaches for this internally whenever it is handed a
 * bare class directly, which is what lets `@onError(SomeEvent)` read the
 * same way `@onCreate(SomeEvent)` does — this export exists for the times a
 * factory value is needed on its own, detached from the decorator call
 * (assigned to a `const`, passed elsewhere), where the implicit dispatch
 * inside `onError` doesn't apply.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`.
 * @returns A factory that ignores the caught error and builds a fresh
 *   `event` instance on every call.
 *
 * @example
 * ```ts
 * const onInvalid = fromClass(InvalidPostTagEvents);
 * // equivalent, spelled out: (error: unknown) => new InvalidPostTagEvents("")
 * ```
 */
export function fromClass(
	event: BareDomainEventClass,
): EntityErrorEventFactory {
	return () => new event("");
}
