/**
 * Resolves a `meta.default`, which may come as a ready value or as a thunk.
 *
 * The thunk exists so an expensive default — `generateUUID()`, `new Date()` —
 * is not evaluated on the constructions that pass a real value and would throw
 * the default away. The discriminant is `typeof === "function"`, so a VO whose
 * `ValueType` *is* a function would have to wrap it in a thunk; no VO in the
 * domain wraps a function.
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 *
 * @param value - The subclass's `meta.default`: a value or a thunk.
 * @returns The value, evaluated.
 */
export function resolveDefault<ValueType>(
	value: ValueType | (() => ValueType),
): ValueType {
	return typeof value === "function" ? (value as () => ValueType)() : value;
}
