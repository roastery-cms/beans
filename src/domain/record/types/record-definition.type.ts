import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * What `defineRecord()` returns: the blueprint, the record-type name used as
 * the `source` of every exception the construction raises, and optionally the
 * keys this record treats as sensitive.
 *
 * **There is no `unique`**, unlike `EntityDefinition`. Uniqueness is an
 * invariant of a *set of rows*, and a record is never a row: it has no
 * identity, no repository port derived from it, and nothing to be unique
 * against. A value-object's own `meta.unique` is likewise never read for a
 * record's keys.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @example
 * ```ts
 * protected defineRecord(): RecordDefinition<typeof moneyProperties> {
 *   return { properties: moneyProperties, source: "money" };
 * }
 * ```
 *
 * @see `EntityDefinition` in `@/domain/entity/types` — the entity counterpart,
 *   which also carries `unique`.
 */
export type RecordDefinition<
	PropertiesShape extends RecordPropertiesShapeBase,
> = {
	/** The blueprint: one property class per domain property. */
	properties: PropertiesShape;

	/** Stable record-type identifier (e.g. `"money"`), used as the exception `source`. */
	source: string;

	/** Keys this record redacts, on top of whatever its value-objects declare themselves. */
	sensitive?: readonly RecordDomainKeys<PropertiesShape>[];
};
