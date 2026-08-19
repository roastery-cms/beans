import type { DomainKeys } from "./domain-keys.type";
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

	/**
	 * Extra blueprint keys this entity treats as secret, beyond the ones whose
	 * value-object already declares `sensitive: true` in its `defineMeta`.
	 *
	 * For the case the type alone does not settle — a `StringVO` holding an API
	 * token is secret in this aggregate but not as a kind of value. Redacted
	 * keys are suppressed from `toString()` and Node's inspect output;
	 * `toJSON()` stays lossless, because it is the persistence contract and has
	 * to close the loop with `fromJSON`. Reach for `toSafeJSON()` when you want
	 * the redacted object itself.
	 */
	sensitive?: readonly DomainKeys<PropertiesShape>[];

	/**
	 * Extra blueprint keys this entity treats as unique, beyond the ones whose
	 * value-object already declares `unique: true` in its `defineMeta`.
	 *
	 * For the case the type alone does not settle — a `SlugVO` is unique per
	 * post but not as a kind of value. `id` is **not** listed here and cannot
	 * be: identity is the primary key, so it is always unique, and
	 * `DomainKeys` excludes it from this list precisely so the obvious never
	 * has to be declared.
	 *
	 * Declarative only. Nothing in the domain layer enforces it, because
	 * uniqueness is a property of the set of stored rows — the repository
	 * adapter reads it back through `uniqueKeysOf(EntityClass)` or
	 * `entity.isUnique(key)` and honours it there.
	 *
	 * A key backed by a **nested entity** is honoured too, by comparing the
	 * whole serialized sub-object — what a database would do with a JSON column
	 * under a unique index.
	 */
	unique?: readonly DomainKeys<PropertiesShape>[];
};
