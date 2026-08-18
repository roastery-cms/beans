import type { DomainKeys } from "./domain-keys.type";
import type { Optionalize } from "./optionalize.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RawValueOf } from "./raw-value-of.type";
import type { UndefinedableKeys } from "./undefinedable-keys.type";

/**
 * A full blueprint's worth of {@link RawValueOf}: one serialized value per
 * property key — the domain half of what `toJSON()` returns.
 *
 * Every key is required **except** the ones whose value-object accepts
 * `undefined` ({@link UndefinedableKeys}), which are optional: `toJSON()`
 * emits them as present-with-`undefined`, and `JSON.stringify` then drops
 * them entirely, so a payload that made a real round-trip legitimately
 * arrives without them. `modelFor` relaxes exactly the same keys at the
 * schema level, so the type and the runtime validation agree.
 *
 * Ruled keys (`RuledKeys`, in `./ruled-keys.type`) stay required — a rule acts
 * on construction input only, never on serialization, so `toJSON()` always
 * emits them and `fromJSON` always demands them.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link SerializedEntity} — this plus the identity fields.
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — the input
 *   counterpart, which relaxes ruled keys as well.
 */
export type SerializedValuesOf<PropertiesShape extends PropertiesShapeBase> =
	Optionalize<
		{
			[Key in DomainKeys<PropertiesShape>]: RawValueOf<PropertiesShape[Key]>;
		},
		UndefinedableKeys<PropertiesShape>
	>;
