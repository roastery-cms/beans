import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";
import type { WrappedRawOf } from "@/domain/wrapper/types/wrapped-raw-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * The **serialized** form of one command blueprint property: the inner
 * class's serialized form under the declared multiplicity for a wrapper, the
 * return of `toJSON()` for a nested record, the wrapped `value` for a
 * value-object.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link CommandInputValueOf} — the input-side counterpart, where a
 *   nested record's own rules relax its payload.
 */
export type CommandRawValueOf<
	Class extends AnyValueObjectClass | AnyRecordClass | AnyWrapperClass,
> = Class extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedRawOf<Kind, Inner>
	: Class extends AnyRecordClass
		? ReturnType<Class["prototype"]["toJSON"]>
		: Class extends AnyValueObjectClass
			? Class["prototype"]["value"]
			: never;
