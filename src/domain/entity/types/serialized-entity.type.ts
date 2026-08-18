import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { IRawEntity } from "./raw-entity.interface";
import type { SerializedValuesOf } from "./serialized-values-of.type";

/**
 * The full serialized form of an `Entity`: identity fields plus one raw value
 * per blueprint property. This is what `toJSON()` returns and what the static
 * `fromJSON` validates and accepts.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 */
export type SerializedEntity<PropertiesShape extends PropertiesShapeBase> =
	IRawEntity & SerializedValuesOf<PropertiesShape>;
