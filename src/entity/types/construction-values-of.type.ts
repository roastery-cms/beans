import type { DomainKeys } from "./domain-keys.type";
import type { InputValueOf } from "./input-value-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RuledKeys } from "./ruled-keys.type";

/**
 * The domain half of a construction payload: one raw input value per blueprint
 * property, with the **ruled** keys optional — those are the ones the base can
 * fill from a `default` or a `derive`.
 *
 * For a plain blueprint {@link RuledKeys} is `never`, so every key stays
 * required and this collapses into the original `InputValuesOf`.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see `RawContextOf` in `./raw-context-of.type` — this intersected with the
 *   identity rule, forming the constructor payload.
 * @see `InputValuesOf` in `./input-values-of.type` — the all-required variant
 *   `setMany` takes a `Partial` of.
 */
export type ConstructionValuesOf<PropertiesShape extends PropertiesShapeBase> =
	{
		[Key in Exclude<
			DomainKeys<PropertiesShape>,
			RuledKeys<PropertiesShape>
		>]: InputValueOf<PropertiesShape[Key]>;
	} & {
		[Key in Extract<
			DomainKeys<PropertiesShape>,
			RuledKeys<PropertiesShape>
		>]?: InputValueOf<PropertiesShape[Key]>;
	};
