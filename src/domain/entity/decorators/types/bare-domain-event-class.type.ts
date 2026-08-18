import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * A payload-less `DomainEvent` subclass reference — a constructor that takes
 * only `aggregateId`, the same shape `Entity.raiseEvent` already accepts
 * bare, without `new`.
 *
 * The lifecycle decorators (`onCreate`, `onUpdate`, `onDelete`) are
 * declared once, at the class, so they can only ever pass this bare-class
 * form to `raiseEvent` — there is no per-call payload available at
 * decoration time to build a concrete instance from.
 *
 * @see `Entity.raiseEvent` in `../../entity` — the method every lifecycle
 *   decorator ultimately calls.
 */
export type BareDomainEventClass = new (aggregateId: string) => IDomainEvent;
