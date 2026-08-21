import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";

/**
 * Whether a blueprint value is a **multiplicity wrapper** class — one of the
 * classes `arrayOf` / `optionalOf` / `nullableOf` mint around another
 * blueprint class.
 *
 * The one discriminant in the package that probes a **static** rather than a
 * prototype method, and deliberately so: `wrapperKind` is also what the *type*
 * level reads (`Class["wrapperKind"]`), so probing anything else at runtime
 * would create a second source for the same question — exactly the drift the
 * house rule about "only one place states a rule" exists to prevent.
 *
 * @param candidate - A blueprint property class.
 * @returns `true` when the class carries a `wrapperKind` static.
 *
 * @see `isWrapper` in `./is-wrapper` — the instance-side twin.
 * @see `isEntityClass` in `./is-entity-class` — the prototype-probing siblings.
 */
export function isWrapperClass(
	candidate: unknown,
): candidate is AnyWrapperClass {
	return (
		typeof candidate === "function" &&
		typeof (candidate as { wrapperKind?: unknown }).wrapperKind === "string"
	);
}
