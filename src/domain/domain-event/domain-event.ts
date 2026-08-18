import { DateTimeVO } from "@/domain/collections/value-objects";
import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { IDomainEvent } from "./types";

/**
 * Convenience abstract base for writing concrete domain-event classes. A
 * subclass declares **only** `defineName()` — the event's stable,
 * dot-namespaced name — and passes `aggregateId` up through `super()`;
 * `occurredAt` is stamped by the base itself.
 *
 * This is optional sugar over {@link IDomainEvent}: `Entity.raiseEvent`
 * already accepts any object shaped like `{ name, ...payload }` and stamps
 * `occurredAt`/`aggregateId` on its own regardless of what the passed object
 * already carries, so a plain object literal works there too. `DomainEvent`
 * exists for events with their own payload fields, where a class reads
 * better than repeating `{ name: "...", ...payload }` at every call site —
 * and lets the event be constructed and inspected on its own, without an
 * `Entity` in the loop.
 *
 * ```ts
 * class OrderConfirmed extends DomainEvent {
 *   public constructor(
 *     aggregateId: string,
 *     public readonly total: number,
 *   ) {
 *     super(aggregateId);
 *   }
 *
 *   protected defineName(): string {
 *     return "order.confirmed";
 *   }
 * }
 *
 * // inside Order (from @roastery/beans/domain/entity):
 * public confirm(): void {
 *   this.set("status", "confirmed");
 *   this.raiseEvent(new OrderConfirmed(this.id, this.total));
 * }
 * ```
 *
 * @see {@link IDomainEvent} — the contract this class implements.
 * @see `Entity.raiseEvent` in `@roastery/beans/domain/entity` — the buffer these events are pushed into.
 */
export abstract class DomainEvent implements IDomainEvent {
	/** A stable, dot-namespaced event name (e.g. `"order.confirmed"`), from {@link DomainEvent.defineName}. */
	public readonly name: string;

	/** ISO 8601 instant the event was constructed, stamped by the base. */
	public readonly occurredAt: string;

	/** The id of the entity this event is about. */
	public readonly aggregateId: string;

	/**
	 * Declares the event's stable, dot-namespaced name (e.g.
	 * `"order.confirmed"`).
	 *
	 * **Must be a prototype method, never a class field** — the base invokes
	 * it inside the constructor, before any field initializer runs.
	 *
	 * @returns The event's name.
	 */
	protected abstract defineName(): string;

	/**
	 * @param aggregateId - The id of the entity this event is about — the
	 *   only thing a subclass's constructor needs to supply, alongside any
	 *   payload fields of its own.
	 *
	 * @throws `InvalidEntityDefinitionException` — when `defineName` is not a
	 *   prototype method.
	 */
	public constructor(aggregateId: string) {
		if (typeof this.defineName !== "function")
			throw new InvalidEntityDefinitionException(
				"domain-event",
				"DomainEvent: defineName must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.",
			);

		this.name = this.defineName();
		this.occurredAt = DateTimeVO.now({
			name: "occurredAt",
			source: this.name,
		}).value;
		this.aggregateId = aggregateId;
	}
}
