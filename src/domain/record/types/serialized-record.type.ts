import type { SerializedValuesOf } from "@/domain/entity/types/serialized-values-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * What a record's `toJSON()` returns and its `fromJSON` accepts: one
 * serialized value per blueprint key.
 *
 * Every key is required **except** the ones whose value-object accepts
 * `undefined`, which are optional — `toJSON()` emits them as
 * present-with-`undefined`, `JSON.stringify` then drops them, so a payload
 * that made a real round-trip legitimately arrives without them. Ruled keys
 * stay required: a rule acts on construction input only, never on
 * serialization.
 *
 * The entity's `SerializedEntity` is this intersected with `IRawEntity`. Here
 * there is nothing to intersect, so the two names coincide in content and
 * differ in exactly the identity fields.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `SerializedEntity` in `@/domain/entity/types` — the entity counterpart.
 */
export type SerializedRecord<
	PropertiesShape extends RecordPropertiesShapeBase,
> = SerializedValuesOf<PropertiesShape>;
