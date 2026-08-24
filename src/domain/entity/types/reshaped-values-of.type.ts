import type { EffectiveShapeOf } from "./effective-shape-of.type";
import type { Optionalize } from "./optionalize.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { ReshapeKeys } from "./reshape-keys.type";
import type { ReshapeShapeBase } from "./reshape-shape-base.type";
import type { ReshapedValueOf } from "./reshaped-value-of.type";
import type { UndefinedableKeys } from "./undefinedable-keys.type";

/**
 * A full reshape target's worth of {@link ReshapedValueOf}: one serialized
 * value per target key — the domain half of what `reshapeTo` returns.
 *
 * The two-shape counterpart of `SerializedValuesOf`, and structurally the same
 * type: a mapped type over {@link ReshapeKeys} (never bare `keyof`, so a ruled
 * target's `Rules` slot cannot leak into the projection), wrapped in
 * {@link Optionalize} over the keys that may legitimately arrive missing after
 * a `JSON.stringify` round trip.
 *
 * It takes a second shape because a nested-shape key's value and optionality
 * are read off the *source*, not the target — see {@link ReshapedValueOf} and
 * {@link EffectiveShapeOf} for the two halves of that. A target made only of
 * classes resolves identically to `SerializedValuesOf<Shape>`, which is what
 * keeps every projection written before nested shapes existed typed the same.
 *
 * @typeParam Shape - The reshape target, whose keys the result is cut down to.
 * @typeParam SourceShape - The blueprint the source instance was built from.
 *
 * @see `SerializedValuesOf` in `./serialized-values-of.type` — the one-shape
 *   form, shared with `toJSON()`.
 * @see `ReshapedTo` in `./reshaped-to.type` — this plus the root identity rule.
 */
export type ReshapedValuesOf<
	Shape extends ReshapeShapeBase,
	SourceShape extends PropertiesShapeBase,
> = Optionalize<
	{
		[Key in ReshapeKeys<Shape>]: ReshapedValueOf<
			Shape[Key],
			Key extends keyof SourceShape ? SourceShape[Key] : never
		>;
	},
	UndefinedableKeys<EffectiveShapeOf<Shape, SourceShape>>
>;
