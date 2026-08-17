/**
 * @module @roastery/beans/domain-event/types
 *
 * Re-exports:
 * - {@link IDomainEvent} — the `{ name, occurredAt, aggregateId }` shape every
 *   domain event satisfies, whether raised as a plain object or through
 *   {@link DomainEvent}.
 */

export type { IDomainEvent } from "./domain-event.interface";
