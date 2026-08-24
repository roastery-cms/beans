import type { ProjectedOnto } from "./projected-onto.type";
import type { RawValueOf } from "./raw-value-of.type";
import type { ReshapeShapeBase } from "./reshape-shape-base.type";

/**
 * The serialized form of one **reshape target key**, dispatching on what the
 * target declares for it: a class or a nested shape.
 *
 * A class target is answered by {@link RawValueOf}, unchanged — it is the same
 * question `toJSON()` asks, and the class carries its own multiplicity and its
 * own identity half. A nested-shape target is answered by
 * {@link ProjectedOnto}, which reads both off the *source* instead.
 *
 * ### The discriminant
 *
 * The probe is a **construct signature plus a prototype**, written inline and
 * captured with `infer Class extends …` so the branch hands `RawValueOf` a
 * type that provably meets its bound:
 * `Target extends infer Class extends { readonly prototype: unknown; new (...args: never[]): unknown }`. All four blueprint kinds
 * declare one — `AnyValueObjectClass`, `AnyEntityClass`, `AnyRecordClass` and
 * `AnyWrapperClass` — while a nested shape is a plain object type and a
 * `RuledBlueprint` is that plus a symbol slot, so neither can satisfy it. It is
 * the type-level twin of the `typeof candidate === "function"` every runtime
 * predicate in `@/shared/helpers` already gates on.
 *
 * The parameter list is a **rest** of `never[]`, not a single `never`: a
 * value-object constructor takes two arguments (`value` and the identification
 * context) and a signature with more required parameters is not assignable to
 * one with fewer, so a one-parameter probe silently answers `false` for every
 * value-object key — which is to say for most of a target.
 *
 * Written inline, and **not** as `Target extends AnyPropertyClass`, for the
 * reason `docs/decisions/wrapper-type-constraints.md` records as measured: the
 * full structural form drags `AnyWrapper`'s five members into the comparison at
 * every key of every target and TypeScript gives up with **TS2589**.
 *
 * @typeParam Target - The class or nested shape the target declares for the key.
 * @typeParam Source - The class the source blueprint declares for the key.
 *
 * @example
 * ```ts
 * type A = ReshapedValueOf<typeof StringVO, typeof StringVO>;   // string
 * type B = ReshapedValueOf<typeof AuthorCard, typeof Author>;   // AuthorCard's own toJSON
 * type C = ReshapedValueOf<typeof authorCard, typeof PostTags>; // readonly { … }[]
 * ```
 *
 * @see {@link RawValueOf} — the class branch, shared with `toJSON()`.
 * @see {@link ProjectedOnto} — the nested-shape branch, driven by the source.
 */
export type ReshapedValueOf<Target, Source> = Target extends infer Class extends
	{
		readonly prototype: unknown;
		new (...args: never[]): unknown;
	}
	? RawValueOf<Class>
	: Target extends ReshapeShapeBase
		? ProjectedOnto<Target, Source>
		: never;
