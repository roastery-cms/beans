import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { WrappableClass } from "./wrappable-class.type";
import type { WrappedRawOf } from "@/domain/wrapper/types/wrapped-raw-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * The **serialized** form of one blueprint property: for a multiplicity
 * wrapper, the inner class's serialized form under that multiplicity; the
 * return of `toJSON()` for a nested entity or record; the wrapped `value` for
 * a value-object.
 *
 * The two nested branches resolve identically and are still written out
 * separately, mirroring the shape of {@link InputValueOf} — where they
 * genuinely diverge.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link InputValueOf} — the input-side counterpart, where a nested
 *   entity's identity becomes optional.
 */
export type RawValueOf<Class extends AnyPropertyClass> = Class extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedRawOf<Kind, Inner>
	: Class extends AnyEntityClass
		? ReturnType<Class["prototype"]["toJSON"]>
		: Class extends AnyRecordClass
			? ReturnType<Class["prototype"]["toJSON"]>
			: Class extends AnyValueObjectClass
				? Class["prototype"]["value"]
				: never;
