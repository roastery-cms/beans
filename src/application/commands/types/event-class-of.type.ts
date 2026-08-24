import type { DomainEvent } from "@/domain/domain-event";

/**
 * A `DomainEvent` **subclass reference** — deliberately not constructible.
 *
 * Narrower than `DomainEventClassOf` (`@roastery/beans/domain/domain-event/types`) and than
 * `Entity.raiseEvent`'s own inline bare-class overload (`new (aggregateId: string) => Event`):
 * both of those exist to *build* an instance, so they need a construct signature callable with
 * just `aggregateId`. `.on()` never builds anything — `nameOf` reads the class's `name` off an
 * `Object.create(eventClass.prototype)` probe, bypassing the constructor entirely — so requiring
 * a construct signature here would reject exactly the events this pillar exists to react to: any
 * hand-written `DomainEvent` subclass whose constructor needs more than `aggregateId` (e.g.
 * `OrderConfirmed(aggregateId, total)`) satisfies this type, while it would **not** satisfy
 * `new (aggregateId: string) => Event`.
 *
 * @typeParam Event - The concrete `DomainEvent` subclass's instance type.
 * @see `nameOf` in `../helpers/name-of` — the only place this type's `prototype` is read.
 */
export type EventClassOf<Event extends DomainEvent = DomainEvent> = {
	/** Read by `nameOf` via `Object.create`, never via `new`. */
	readonly prototype: Event;
};
