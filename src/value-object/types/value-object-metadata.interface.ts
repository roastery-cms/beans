import type { t } from "@roastery/terroir";

/**
 * What a `ValueObject` **is**: the schema that validates its values and the
 * default it falls back to in demo mode. This is what a subclass's
 * `defineMeta()` returns, and what the base stores under the `Meta` symbol.
 *
 * Two rules bind the pair together:
 *
 * - **`default` must pass `model`.** The base validates the default like any
 *   other value, so an invalid default makes `demo()` throw — and breaks the
 *   schema of any entity whose blueprint includes the class.
 * - **`default` may be a thunk, and should be whenever it is expensive.**
 *   `defineMeta()` runs on every construction, so a computed value would be
 *   evaluated even when a real value is given and the default thrown away; a
 *   thunk is only invoked in demo mode. Note the base does **not** run
 *   `transform` over defaults — declare them already in canonical form.
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 *
 * @example
 * ```ts
 * protected defineMeta(): IValueObjectMetadata<string, typeof UuidDTO> {
 *   return { default: generateUUID, schema: UuidSchema };
 * }
 * ```
 */
export interface IValueObjectMetadata<ValueType, SchemaType extends t.TSchema> {
	/** Demo-mode fallback: a ready value, or a thunk for expensive defaults. */
	readonly default: ValueType | (() => ValueType);

	/** Compiled schema every wrapped value (defaults included) must pass. */
	readonly schema: SchemaType;
}
