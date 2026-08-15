import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * What a subclass's `defineEntity()` returns: the blueprint and the
 * entity-type name.
 *
 * `defineEntity` must be a prototype method (never a class field — the base
 * invokes it during construction, before field initializers run) and must be
 * pure (`fromJSON` invokes it on a probe created without running any
 * constructor).
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @example
 * ```ts
 * protected defineEntity(): EntityDefinition<typeof postProperties> {
 *   return { properties: postProperties, source: "post" };
 * }
 * ```
 */
export type EntityDefinition<PropertiesShape extends PropertiesShapeBase> = {
	properties: PropertiesShape;
	source: string;
};
