import type { DomainKeys } from "./domain-keys.type";
import type { InputValueOf } from "./input-value-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RuledKeys } from "./ruled-keys.type";
import type { UndefinedableKeys } from "./undefinedable-keys.type";

/**
 * The domain half of a construction payload: one raw input value per blueprint
 * property, with the **ruled** keys and the **`undefined`-accepting** keys
 * optional — the former the base can fill from a `default`/`derive`, the
 * latter already accept `undefined` as a value in their own right (built with
 * `optionalVO`), so omitting the key entirely is no different at runtime.
 *
 * For a plain blueprint with no rules and no `optionalVO`-backed properties,
 * both {@link RuledKeys} and {@link UndefinedableKeys} are `never`, so every
 * key stays required and this collapses into the original `InputValuesOf`.
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
			RuledKeys<PropertiesShape> | UndefinedableKeys<PropertiesShape>
		>]: InputValueOf<PropertiesShape[Key]>;
	} & {
		[Key in Extract<
			DomainKeys<PropertiesShape>,
			RuledKeys<PropertiesShape> | UndefinedableKeys<PropertiesShape>
		>]?: InputValueOf<PropertiesShape[Key]>;
	};
