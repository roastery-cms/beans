import type { Entity } from "@/entity";
import type { t } from "@roastery/terroir";

/**
 * Method decorator that wraps the target method to call `this.update()` after it
 * returns, stamping `updatedAt` to the current ISO timestamp on every successful
 * mutation.
 *
 * Uses **legacy** TC39 decorator semantics (the `_target`, `_propertyKey`,
 * `descriptor` triple — requires `experimentalDecorators: true` in the consumer's
 * `tsconfig.json`). The decorator preserves the original method's return value and
 * `this`-binding; the `update()` side-effect runs *after* the wrapped call so
 * exceptions thrown by the wrapped method short-circuit the update.
 *
 * Only valid on methods of classes that extend {@link Entity} — the type
 * parameter `EntityType` enforces this at the call site, and the wrapped
 * function relies on `this.update()` being available.
 *
 * @typeParam EntityType - The decorated method's owning class. Must extend
 *   `Entity<t.TSchema>` so the `update()` method is in scope on `this`.
 *
 * @param _target - The class prototype (unused at runtime; typed for the constraint).
 * @param _propertyKey - The decorated method's name (unused at runtime).
 * @param descriptor - The property descriptor whose `value` is the method to wrap.
 * @returns The mutated descriptor (`descriptor.value` replaced by the wrapper).
 *
 * @example
 * ```ts
 * import { Entity, AutoUpdate } from "@roastery/beans";
 * import { EntityContext } from "@roastery/beans/entity";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   @AutoUpdate
 *   public rename(title: string): void {
 *     this._title = DefinedStringVO.make(title, this[EntityContext]("title"));
 *   }
 * }
 * ```
 */
export function AutoUpdate<EntityType extends Entity<t.TSchema>>(
	_target: EntityType,
	_propertyKey: string,
	descriptor: PropertyDescriptor,
): PropertyDescriptor {
	const originalMethod = descriptor.value;

	descriptor.value = function (this: EntityType, ...args: unknown[]) {
		const result = originalMethod.apply(this, args);
		this.update();
		return result;
	};

	return descriptor;
}
