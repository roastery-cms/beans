import type { IValueObjectHooks } from "./value-object-hooks.interface";

/**
 * Payload of the sugar factories (`customStringVO`, `customNumberVO`,
 * `customObjectVO`, `customRecordVO`, `customArrayVO`). One interface serves
 * all of them — they differ only in which TypeBox options record they accept.
 *
 * The schema options stay **nested** under `options` rather than spread across
 * the payload, and deliberately so: TypeBox's `SchemaOptions` already declares
 * a `default` field — the JSON Schema annotation — which means something else
 * entirely from this package's demo-mode fallback. Nesting keeps the two apart
 * instead of making one shadow the other.
 *
 * @typeParam ValueType - Runtime type of the value the generated VO wraps.
 * @typeParam OptionsType - The TypeBox options record for the schema kind
 *   (`t.StringOptions`, `t.NumberOptions`, `t.ArrayOptions`, `t.ObjectOptions`).
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed.
 *
 * @see {@link IDefineValueObjectArgs} — the core payload these are lowered into.
 *
 * @example
 * ```ts
 * customStringVO({
 * 	options: { minLength: 4, maxLength: 120 },
 * 	default: "title",
 * 	name: "PostTitle",
 * });
 * ```
 */
export interface ICustomValueObjectArgs<
	ValueType,
	OptionsType,
	Sensitive extends boolean = false,
> extends IValueObjectHooks<ValueType, Sensitive> {
	/**
	 * Demo-mode fallback. Optional here: each factory supplies a placeholder
	 * for its own kind (`""`-free `"string"`, `0`, `[]`, `{}`) when it is
	 * omitted. Whatever ends up being used is validated inside the factory
	 * call, so a placeholder the `options` reject fails at import time rather
	 * than at the first `demo()`.
	 */
	readonly default?: ValueType | (() => ValueType);

	/** TypeBox options narrowing the schema this factory builds. */
	readonly options?: OptionsType;
}
