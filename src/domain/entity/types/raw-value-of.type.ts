import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The **serialized** form of one blueprint property: the return of `toJSON()`
 * for a nested entity or record, the wrapped `value` for a value-object.
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
export type RawValueOf<Class extends AnyPropertyClass> =
	Class extends AnyEntityClass
		? ReturnType<Class["prototype"]["toJSON"]>
		: Class extends AnyRecordClass
			? ReturnType<Class["prototype"]["toJSON"]>
			: Class extends AnyValueObjectClass
				? Class["prototype"]["value"]
				: never;
