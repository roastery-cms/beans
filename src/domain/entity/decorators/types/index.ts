/**
 * @module @roastery/beans/domain/entity/decorators/types
 *
 * Types of the lifecycle-decorator pillar.
 *
 * Re-exports:
 * - {@link BareDomainEventClass} — the payload-less event-class shape every
 *   lifecycle decorator accepts.
 * - {@link EntityErrorEventFactory} — the `(error) => Event` factory shape
 *   `onError` accepts, letting the raised event carry the caught error.
 */

export type { BareDomainEventClass } from "./bare-domain-event-class.type";
export type { EntityErrorEventFactory } from "./entity-error-event-factory.type";
