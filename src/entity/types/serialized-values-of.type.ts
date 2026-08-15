import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RawValueOf } from "./raw-value-of.type";

/**
 * A full blueprint's worth of {@link RawValueOf}: one serialized value per
 * property key — the domain half of what `toJSON()` returns.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link SerializedEntity} — this plus the identity fields.
 */
export type SerializedValuesOf<PropertiesShape extends PropertiesShapeBase> = {
	[Key in DomainKeys<PropertiesShape>]: RawValueOf<PropertiesShape[Key]>;
};
