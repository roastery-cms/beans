/**
 * Whether a **built** blueprint property is a `ValueObject` instance rather
 * than a nested `Entity` or `DomainRecord` one — decided structurally, by the
 * `defineMeta` every value-object inherits from its prototype and neither of
 * the other two declares.
 *
 * The instance-side counterpart of `isValueObjectClass`, and structural for
 * the same reason: reaching for the `ValueObject` class from a shared module
 * would put a class into an import graph that must stay class-free.
 *
 * Prefer this over an `"toJSON" in property` test, which looks equivalent and
 * is not: a value-object may perfectly well declare a `toJSON` of its own, and
 * would then be serialized down the nested-aggregate branch silently.
 *
 * @param property - A built blueprint property.
 * @returns `true` when the value is a value-object instance.
 *
 * @see `isValueObjectClass` in `./is-value-object-class` — the class-side twin.
 */
export function isValueObject(
	property: unknown,
): property is { readonly value: unknown } {
	return (
		typeof (property as { defineMeta?: unknown } | null | undefined)
			?.defineMeta === "function"
	);
}
