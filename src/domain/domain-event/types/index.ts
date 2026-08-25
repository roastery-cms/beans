/**
 * @module @roastery/beans/domain/domain-event/types
 *
 * Re-exports:
 * - {@link IDomainEvent} — the `{ name, occurredAt, aggregateId, payload? }`
 *   shape every domain event satisfies, whether raised as a plain object or
 *   through {@link DomainEvent}.
 * - {@link DomainEventClassOf} — the class `defineDomainEvent(name)` returns.
 * - {@link PayloadDomainEventClassOf} — the class `defineDomainEvent(name, shape)`
 *   returns, which also validates an arriving payload.
 * - {@link SerializedDomainEventClassOf} — the class
 *   `defineDomainEvent(name, Json | SafeJson)` returns.
 * - {@link EventPayloadDeclaration} — what a `static readonly payload` may be.
 * - {@link PayloadShapeBase} — the base constraint of a payload shape.
 */

export type { DomainEventClassOf } from "./domain-event-class-of.type";
export type { IDomainEvent } from "./domain-event.interface";
export type { EventPayloadDeclaration } from "./event-payload-declaration.type";
export type { PayloadDomainEventClassOf } from "./payload-domain-event-class-of.type";
export type { PayloadShapeBase } from "./payload-shape-base.type";
export type { SerializedDomainEventClassOf } from "./serialized-domain-event-class-of.type";
