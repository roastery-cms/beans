import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Builds the event `onError` raises from the error a decorated method threw.
 *
 * Unlike the other decorators' {@link BareDomainEventClass}, this is a
 * factory, not a bare class: `onError` is declared once, at the method, but
 * the error it needs to fold into the event is only known at call time.
 * `Entity.raiseEvent` always overwrites `occurredAt`/`aggregateId` on the way
 * into the buffer regardless of what the factory builds, so the factory is
 * free to spend its constructor arguments entirely on the event's own
 * payload (e.g. a `reason: string` derived from the error), passing any
 * placeholder for `aggregateId`.
 *
 * @param error - The value the decorated method threw. Typed `unknown`
 *   because JS permits throwing anything, not just an `Error`.
 * @returns A built domain-event instance (never a bare class — there is no
 *   `new event(this.id)` step for `onError`, since the caller already has
 *   everything it needs to construct the instance itself).
 */
export type EntityErrorEventFactory = (error: unknown) => IDomainEvent;
