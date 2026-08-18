import { methodHandleDecorator } from "./helpers/method-handle-decorator";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityMethodDecorator } from "./types/entity-method-decorator.type";

/**
 * Method decorator: raises `event` immediately **after** the decorated
 * `Entity` method returns. Unlike the lifecycle decorators (`onCreate`,
 * `onUpdate`, `onDelete`), which each wrap one fixed point of an entity's
 * lifecycle, `afterHandle` wraps an **arbitrary instance method** — any
 * business operation, not a fixed lifecycle point.
 *
 * **Never fires if the method throws.** There is no `try`/`catch`: if the
 * wrapped call throws, the `raiseEvent` call after it simply never executes
 * and the exception propagates untouched — the same as it would through the
 * undecorated method.
 *
 * **Does not await a `Promise`.** If the decorated method is `async` (or
 * otherwise returns a `Promise`), `afterHandle` raises as soon as the
 * synchronous call returns — i.e. once the pending `Promise` itself comes
 * back, not once it settles. No `Entity` method in this package is `async`
 * today, so this is a documented restriction rather than a real gap.
 *
 * Instance methods only — same non-guarded contract as {@link beforeHandle}.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`.
 * @returns A method decorator.
 *
 * @example
 * ```ts
 * class Order extends Entity<typeof orderProperties> {
 *   protected defineEntity(): EntityDefinition<typeof orderProperties> {
 *     return { properties: orderProperties, source: "order" };
 *   }
 *
 *   @afterHandle(OrderShippingCompleted)
 *   public ship(): void {
 *     // business logic
 *   }
 * }
 *
 * order.ship(); // runs the method body, then raises OrderShippingCompleted
 * ```
 *
 * @see {@link beforeHandle} — the before-the-fact counterpart. Stacking both
 *   on the same method always raises before → method → after, regardless of
 *   which decorator is written closer to the method.
 */
export function afterHandle(
	event: BareDomainEventClass,
): EntityMethodDecorator {
	return methodHandleDecorator(event, false);
}
