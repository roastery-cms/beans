import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { SetHandlerOf } from "./set-handler-of.type";

/**
 * The handler map `Entity.onSet()` returns: at most one {@link SetHandlerOf}
 * per domain property, each run just before that property's value is built.
 *
 * Every key is optional — the base's own `onSet()` returns an empty map, so a
 * subclass declares only the properties that carry a rule. Keys outside the
 * blueprint are a compile error, and the `Rules` symbol slot never appears
 * here because the map goes through {@link DomainKeys}.
 *
 * A handler fires only when there is a raw value to set: an explicit payload
 * value, a blueprint `default`, or the result of a `derive`. A key falling
 * back to its own value-object's default fires nothing — which is what keeps
 * `value`'s type honest, and why `demo()` fires only the derived keys.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see `Entity.onSet` in `@/domain/entity/entity` — the hook returning it.
 * @see `RulesOf` in `./rules-of.type` — the same shape, on the producing side.
 *
 * @example
 * ```ts
 * class Post extends entityOf(postProperties, "post") {
 *   protected override onSet(): SetHandlersOf<typeof postProperties> {
 *     return {
 *       title: (value) => {
 *         if (value.trim() === "")
 *           throw new InvalidPropertyException("title", "post");
 *       },
 *     };
 *   }
 * }
 * ```
 */
export type SetHandlersOf<PropertiesShape extends PropertiesShapeBase> = {
	readonly [Key in DomainKeys<PropertiesShape>]?: SetHandlerOf<
		PropertiesShape,
		PropertiesShape[Key]
	>;
};
