/**
 * @module @roastery/beans/domain/domain-event/types
 *
 * Re-exports:
 * - {@link IDomainEvent} — the `{ name, occurredAt, aggregateId }` shape every
 *   domain event satisfies, whether raised as a plain object or through
 *   {@link DomainEvent}.
 * - {@link DomainEventClassOf} — the class `defineDomainEvent` returns.
 */

export type { DomainEventClassOf } from "./domain-event-class-of.type";
export type { IDomainEvent } from "./domain-event.interface";
