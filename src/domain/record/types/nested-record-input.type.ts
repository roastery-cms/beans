import type { Properties } from "@roastery/terroir/symbols";
import type { ConstructionValuesOf } from "@/domain/entity/types/construction-values-of.type";
import type { PropertiesShapeBase } from "@/domain/entity/types";
import type { AnyRecordClass } from "./any-record-class.type";

/**
 * The input payload of a nested record: exactly the payload that record
 * accepts when built on its own — the keys its **own** blueprint rules cover
 * omitted, and the keys its own blueprint lets be `undefined` omitted.
 *
 * The mirror of `NestedEntityInput`, minus one thing: `InputValueOf`
 * intersects the entity branch with `IdentityInput` and leaves this branch
 * alone. That single missing intersection is the whole of what separates a
 * record from an entity at the construction boundary.
 *
 * Two properties are preserved verbatim from `NestedEntityInput`, and both are
 * load-bearing. The blueprint is read through an **inline `infer`** rather
 * than `PropertiesOfClass`, which keeps the mutual recursion lazy — the shape
 * is extracted only once a concrete class is substituted, never eagerly on the
 * widened `AnyRecordClass` bound. And it resolves to the **same**
 * `ConstructionValuesOf` the top level uses, so "a complete payload" means one
 * thing at every depth of an aggregate that mixes entities and records.
 *
 * @typeParam Class - The nested record class.
 *
 * @see `InputValueOf` in `@/domain/entity/types/input-value-of.type` — the step
 *   through which the recursion reaches and leaves this type.
 * @see `NestedEntityInput` in `@/domain/entity/types` — the sibling that
 *   carries the identity intersection.
 */
export type NestedRecordInput<Class extends AnyRecordClass> = Class extends {
	readonly prototype: {
		[Properties]: infer Shape extends PropertiesShapeBase;
	};
}
	? ConstructionValuesOf<Shape>
	: never;
