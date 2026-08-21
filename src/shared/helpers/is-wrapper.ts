/**
 * Whether a **built** blueprint property is a multiplicity wrapper instance
 * rather than a value-object, entity or record one.
 *
 * Reads the `wrapperKind` static back off the instance's constructor, for the
 * same reason `isWrapperClass` probes it in the first place: it is the single
 * source both the runtime and the type level read. A `"unwrap" in property`
 * test would look equivalent and is not — a record is free to declare a method
 * called `unwrap`, and would then be silently unwrapped by `get`.
 *
 * @param property - A built blueprint property.
 * @returns `true` when the value is a wrapper instance.
 *
 * @see `isWrapperClass` in `./is-wrapper-class` — the class-side twin.
 */
export function isWrapper(
	property: unknown,
): property is { unwrap(): unknown } {
	return (
		typeof (
			property as { constructor?: { wrapperKind?: unknown } } | null | undefined
		)?.constructor?.wrapperKind === "string"
	);
}
