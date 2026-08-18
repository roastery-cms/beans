import { methodHandleDecorator } from "./helpers/method-handle-decorator";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityMethodDecorator } from "./types/entity-method-decorator.type";

/**
 * Method decorator: raises `event` immediately **before** the decorated
 * `Entity` method runs. Unlike the lifecycle decorators (`onCreate`,
 * `onUpdate`, `onDelete`), which each wrap one fixed point of an entity's
 * lifecycle, `beforeHandle` wraps an **arbitrary instance method** — any
 * business operation, not a fixed lifecycle point.
 *
 * Instance methods only: decorating a `static` method compiles (nothing in
 * the type constrains the receiver to an instance) but fails at runtime on
 * the `raiseEvent` cast, since a static method's `this` is the class
 * constructor, which has no `raiseEvent`. Not guarded at runtime, the same
 * way the lifecycle decorators don't defend against out-of-contract use
 * either.
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
 *   @beforeHandle(OrderShippingStarted)
 *   public ship(): void {
 *     // business logic
 *   }
 * }
 *
 * order.ship(); // raises OrderShippingStarted, then runs the method body
 * ```
 *
 * @see {@link afterHandle} — the after-the-fact counterpart. Stacking both
 *   on the same method always raises before → method → after, regardless of
 *   which decorator is written closer to the method.
 */
export function beforeHandle(
	event: BareDomainEventClass,
): EntityMethodDecorator {
	return methodHandleDecorator(event, true);
}
