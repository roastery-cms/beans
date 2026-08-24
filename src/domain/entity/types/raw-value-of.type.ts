import type { AnyEntityClass } from "./any-entity-class.type";
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
 * Bounded by `{ readonly prototype: unknown }` rather than by
 * `AnyPropertyClass`: every one of the four kinds declares a prototype, so the
 * bound still rejects the argument that would otherwise resolve to a silent
 * `never` — a nested reshape target, a plain object, anything that is not a
 * class — while staying cheap enough for `ReshapedValueOf` to satisfy through
 * an `infer … extends` probe. Writing the bound as `AnyPropertyClass` and
 * testing for it at the call site would be the measured **TS2589** case
 * `docs/decisions/wrapper-type-constraints.md` records.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link InputValueOf} — the input-side counterpart, where a nested
 *   entity's identity becomes optional.
 */
export type RawValueOf<Class extends { readonly prototype: unknown }> =
	Class extends {
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
