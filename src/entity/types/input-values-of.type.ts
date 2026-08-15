import type { DomainKeys } from "./domain-keys.type";
import type { InputValueOf } from "./input-value-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * A full blueprint's worth of {@link InputValueOf}: one raw input value per
 * property key. `setMany` takes a `Partial` of this; construction intersects
 * it with the identity rule.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link RawContextOf} — the construction payload built on top of this.
 */
export type InputValuesOf<PropertiesShape extends PropertiesShapeBase> = {
	[Key in DomainKeys<PropertiesShape>]: InputValueOf<PropertiesShape[Key]>;
};
