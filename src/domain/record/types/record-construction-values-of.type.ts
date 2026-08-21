import type { ConstructionValuesOf } from "@/domain/entity/types/construction-values-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * A record's construction payload: one raw input value per blueprint property,
 * with the **ruled** keys and the **`undefined`-accepting** keys optional.
 *
 * Unlike an entity's, this **is** the whole payload — there is no identity
 * half to intersect, which is the entire difference between the two pillars'
 * construction contracts.
 *
 * A named alias of `ConstructionValuesOf`: "what a complete payload means" has
 * to be one single answer at every depth of an aggregate, and an aggregate now
 * mixes entities and records freely. Two definitions would let the two drift
 * and make a record nested in an entity stricter than the same record built on
 * its own.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see {@link RawRecordContextOf} — the constructor payload, which is this type
 *   unadorned.
 * @see `RawContextOf` in `@/domain/entity/types` — the entity counterpart, which
 *   intersects the identity rule on top.
 */
export type RecordConstructionValuesOf<
	PropertiesShape extends RecordPropertiesShapeBase,
> = ConstructionValuesOf<PropertiesShape>;
