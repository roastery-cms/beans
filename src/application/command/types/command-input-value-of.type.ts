import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { NestedRecordInput } from "@/domain/record/types/nested-record-input.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The **input** form of one command blueprint property: the raw wrapped value
 * for a value-object; for a nested record, the payload that record accepts
 * when built on its own — the keys its own blueprint rules cover omitted, and
 * the keys it lets be `undefined` omitted.
 *
 * Routing the record branch through `NestedRecordInput` rather than through
 * its serialized form is what keeps a record nested in a command exactly as
 * permissive as the same record built directly, at every depth.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link CommandRawValueOf} — the output-side counterpart.
 */
export type CommandInputValueOf<
	Class extends AnyValueObjectClass | AnyRecordClass,
> = Class extends AnyRecordClass
	? NestedRecordInput<Class>
	: Class extends AnyValueObjectClass
		? Class["prototype"]["value"]
		: never;
