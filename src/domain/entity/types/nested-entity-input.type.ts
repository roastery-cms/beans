import type { Properties } from "@roastery/terroir/symbols";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { ConstructionValuesOf } from "./construction-values-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * The domain half of a nested entity's input payload: exactly the payload
 * that entity accepts when built on its own — identity omitted, the keys its
 * **own** blueprint rules cover omitted, and the keys its own blueprint lets
 * be `undefined` (built with `optionalVO`) omitted.
 *
 * Without this, a nested entity would be stricter than the same entity built
 * on its own — `new Post({ tag: { name: "x" } })` would be a type error while
 * `new PostTag({ name: "x" })` compiles, even though both take the identical
 * path through the base at runtime. The nesting must not change what the
 * domain considers a complete payload.
 *
 * **It is the same `ConstructionValuesOf` the top level uses**, which is what
 * makes that invariant hold at *every* depth rather than only at the first.
 * Deriving the shape from `ReturnType<toJSON>` instead — the serialized form,
 * which carries identity at every level — and stripping `keyof IRawEntity`
 * would strip it only at the outermost level: a grandchild would then still
 * demand its `id`/`createdAt` *and* its ruled keys, so a three-level
 * aggregate could not be written without a cast. Routing through
 * `ConstructionValuesOf` recurses for free, since it reaches nested entities
 * back through `InputValueOf` → this type.
 *
 * That mutual recursion is safe because it stays lazy: the blueprint is read
 * through an inline `infer` (rather than `PropertiesOfClass`), so the shape
 * is only extracted once a concrete class is substituted, never eagerly on
 * the widened `AnyEntityClass` bound. `UndefinedableKeys`, reached from
 * `ConstructionValuesOf`, deliberately reads `["prototype"]["value"]` instead
 * of going through `InputValueOf`, so it never re-enters this type either —
 * which is what keeps a self-referencing blueprint (`{ child: Node }`) from
 * becoming a circular mapped type at the type level. Such a blueprint is
 * still rejected at runtime, by `CyclicEntityDefinitionException`.
 *
 * @typeParam Class - The nested entity class.
 *
 * @see `InputValueOf` in `./input-value-of.type` — intersects this with the
 *   identity rule, and the step through which the recursion comes back here.
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — the shared
 *   definition of "a complete payload", used identically at every depth.
 */
export type NestedEntityInput<Class extends AnyEntityClass> = Class extends {
	readonly prototype: {
		[Properties]: infer Shape extends PropertiesShapeBase;
	};
}
	? ConstructionValuesOf<Shape>
	: never;
