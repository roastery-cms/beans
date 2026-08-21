import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The **serialized** form of one command blueprint property: the return of
 * `toJSON()` for a nested record, the wrapped `value` for a value-object.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link CommandInputValueOf} — the input-side counterpart, where a
 *   nested record's own rules relax its payload.
 */
export type CommandRawValueOf<
	Class extends AnyValueObjectClass | AnyRecordClass,
> = Class extends AnyRecordClass
	? ReturnType<Class["prototype"]["toJSON"]>
	: Class extends AnyValueObjectClass
		? Class["prototype"]["value"]
		: never;
