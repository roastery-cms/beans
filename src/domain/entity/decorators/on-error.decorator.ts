import { fromClass } from "./helpers/from-class";
import { isBareEventClass } from "./helpers/is-bare-event-class";
import { renameDecorated } from "./helpers/rename-decorated";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityErrorEventFactory } from "./types/entity-error-event-factory.type";
import type { EntityMethodDecorator } from "./types/entity-method-decorator.type";

/**
 * Method decorator: raises an event when the decorated `Entity` method
 * throws, then **always re-throws the original error** — the decorated
 * method's observable behaviour is unchanged for whoever calls it, the
 * event is only a side channel.
 *
 * Unlike `beforeHandle`/`afterHandle` (which never introduce a `try`/`catch`
 * around the wrapped method, letting a thrown exception simply propagate),
 * `onError` is the one method decorator in this pillar that does catch. It
 * does not share `methodHandleDecorator`: that helper's whole shape is a
 * bracket around `target.apply` with no branch that can catch, build an
 * event from call-time data, and re-throw — a genuinely different control
 * flow, not a variation on the same one.
 *
 * Accepts **either** the same bare-class form the other four decorators
 * take (`@onError(SomeEvent)`, for a payload-less event that doesn't need
 * the error itself) **or** a factory (`@onError((error) => ...)`, for an
 * event that folds the error into its own payload). The two are
 * distinguished internally via {@link isBareEventClass} — normalizing a
 * bare class through {@link fromClass} — so a caller reaching for the
 * simple form gets the exact same reading experience as `onCreate`/
 * `onUpdate`/`onDelete`.
 *
 * @param event - Either a payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`), or a factory that receives the
 *   caught error (`unknown`, since JS permits throwing anything) and
 *   returns an already-built event instance.
 * @returns A method decorator.
 *
 * @example
 * ```ts
 * class Order extends Entity<typeof orderProperties> {
 *   protected defineEntity(): EntityDefinition<typeof orderProperties> {
 *     return { properties: orderProperties, source: "order" };
 *   }
 *
 *   @onError(OrderShippingFailed) // bare class — same reading as onCreate
 *   public ship(): void {
 *     // business logic that may throw
 *   }
 *
 *   @onError((error) => new OrderShippingFailed("", String(error))) // factory — carries the error
 *   public shipWithReason(): void {
 *     // business logic that may throw
 *   }
 * }
 *
 * order.ship(); // throws → raises OrderShippingFailed, then re-throws
 * ```
 *
 * @see {@link beforeHandle}, {@link afterHandle} — the other method
 *   decorators in this pillar, neither of which ever catches an exception.
 */
export function onError(
	event: BareDomainEventClass | EntityErrorEventFactory,
): EntityMethodDecorator {
	const eventFactory: EntityErrorEventFactory = isBareEventClass(event)
		? fromClass(event)
		: event;

	return (target, context) => {
		const replacement: typeof target = function (...args) {
			try {
				return target.apply(this, args);
			} catch (error) {
				(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
					eventFactory(error),
				);
				throw error;
			}
		};

		return renameDecorated(replacement, { name: String(context.name) });
	};
}
