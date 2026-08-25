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

	/**
	 * What the raising entity contributed, when the event class declared a
	 * `static readonly payload`. Absent otherwise — a payload is always opt-in.
	 *
	 * @remarks
	 * Typed `unknown` on purpose: three declaration forms produce three shapes
	 * (a cut against a payload shape, `entity.toJSON()`, `entity.toSafeJSON()`),
	 * and only the first has a static format. Narrow it with the event class's
	 * own `fromJSON` — which exists only on the shape form, since only that one
	 * has something to check against.
	 *
	 * The root's identity is **not** here: `aggregateId` already carries the
	 * raising entity's `id`. A nested aggregate keeps its own, which is what
	 * makes the payload hydratable one level down.
	 *
	 * @see `eventPayloadOf` in `@roastery/beans/domain/entity/helpers` — what fills this in.
	 */
	readonly payload?: unknown;
}
