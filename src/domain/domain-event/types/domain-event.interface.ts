/**
 * Behavioural contract every domain event satisfies. `Entity.raiseEvent`
 * builds the full shape itself — a subclass only ever supplies `name` (plus
 * whatever payload it adds); `occurredAt` and `aggregateId` are stamped by
 * the base and can never be overridden by the caller.
 *
 * @see `Entity.raiseEvent` in `@roastery/beans/domain/entity` — the only place that constructs this shape.
 * @see `Entity.pullDomainEvents` in `@roastery/beans/domain/entity` — drains the buffer these accumulate into.
 * @see {@link DomainEvent} — the convenience abstract base implementing this contract.
 */
export interface IDomainEvent {
	/** A stable, dot-namespaced event name (e.g. `"order.confirmed"`). */
	readonly name: string;

	/** ISO 8601 instant the event was raised, stamped by the base. */
	readonly occurredAt: string;

	/** The raising entity's own `id`, stamped by the base — the "thin" floor every event carries. */
	readonly aggregateId: string;
}
