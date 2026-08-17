import type { Properties } from "@roastery/terroir/symbols";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { Optionalize } from "./optionalize.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { IRawEntity } from "./raw-entity.interface";
import type { RuledKeys } from "./ruled-keys.type";
import type { UndefinedableKeys } from "./undefinedable-keys.type";

/**
 * The domain half of a nested entity's input payload: its serialized
 * properties minus the identity, with the keys its **own** blueprint rules
 * cover, and the keys its own blueprint already lets be `undefined` (built
 * with `optionalVO`), made optional.
 *
 * Without this, a nested entity would be stricter than the same entity built
 * on its own — `new Post({ tag: { name: "x" } })` would be a type error while
 * `new PostTag({ name: "x" })` compiles, even though both take the identical
 * path through the base at runtime. The nesting must not change what the
 * domain considers a complete payload.
 *
 * The blueprint is read through an inline `infer` rather than
 * `PropertiesOfClass`: the serialized types recurse through nested entities,
 * and deferring the extraction is what keeps that recursion from being
 * re-instantiated on the widened `AnyEntityClass` bound.
 *
 * @typeParam Class - The nested entity class.
 *
 * @see `InputValueOf` in `./input-value-of.type` — intersects this with the
 *   identity rule.
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — the
 *   top-level counterpart, built straight from the blueprint.
 */
export type NestedEntityInput<Class extends AnyEntityClass> = Optionalize<
	Omit<ReturnType<Class["prototype"]["toJSON"]>, keyof IRawEntity>,
	Class extends {
		readonly prototype: {
			[Properties]: infer Shape extends PropertiesShapeBase;
		};
	}
		? RuledKeys<Shape> | UndefinedableKeys<Shape>
		: never
>;
