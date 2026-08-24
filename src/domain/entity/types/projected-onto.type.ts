import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { WrappedAs } from "@/domain/wrapper/types/wrapped-as.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { PropertiesOfClass } from "./properties-of-class.type";
import type { IRawEntity } from "./raw-entity.interface";
import type { ReshapeShapeBase } from "./reshape-shape-base.type";
import type { ReshapedValuesOf } from "./reshaped-values-of.type";
import type { WrappableClass } from "./wrappable-class.type";

/**
 * The serialized form of a key whose reshape target is a **nested shape** —
 * the branch where the source, not the target, decides what comes out.
 *
 * `RawValueOf` answers the same question for a key whose target is a class,
 * and answers it from the target alone: the class states its own multiplicity
 * and its own identity half. A nested shape states neither, so both are read
 * off the source's blueprint class here:
 *
 * - a wrapped source keeps its multiplicity, through the same {@link WrappedAs}
 *   every `Wrapped*Of` applies — an array of projections for `arrayOf`, the
 *   projection or `undefined` for `optionalOf`, or `null` for `nullableOf`;
 * - an `Entity` source contributes {@link IRawEntity}, at every level, which is
 *   what keeps the projection feedable to another entity's `fromJSON`;
 * - a `DomainRecord` source has no identity to give and contributes none;
 * - a value-object source resolves to `never` — a nested shape cuts an
 *   aggregate, and the runtime throws `InvalidPropertyException` for it.
 *
 * The wrapper branch probes the two statics **inline** and comes first, the
 * same order and for the same measured reason `RawValueOf` does — see
 * `AnyWrapperClass`. The recursion is at most one level deep: a wrapper does
 * not wrap a wrapper.
 *
 * @typeParam Target - The nested reshape target declared for the key.
 * @typeParam Source - The class the source blueprint declares for the key.
 *
 * @example
 * ```ts
 * type A = ProjectedOnto<typeof tagCard, typeof PostTags>; // readonly { id; createdAt; name }[]
 * type B = ProjectedOnto<typeof cardShape, typeof Author>;  // { id; createdAt; name }
 * type C = ProjectedOnto<typeof amountShape, typeof Money>; // { amount } — a record brings none
 * ```
 *
 * @see `RawValueOf` in `./raw-value-of.type` — the class-target counterpart.
 * @see `ReshapedValueOf` in `./reshaped-value-of.type` — the dispatcher that
 *   picks between the two.
 */
export type ProjectedOnto<
	Target extends ReshapeShapeBase,
	Source,
> = Source extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedAs<Kind, ProjectedOnto<Target, Inner>>
	: Source extends AnyEntityClass
		? IRawEntity & ReshapedValuesOf<Target, PropertiesOfClass<Source>>
		: Source extends AnyRecordClass
			? ReshapedValuesOf<Target, PropertiesOfClass<Source>>
			: never;
