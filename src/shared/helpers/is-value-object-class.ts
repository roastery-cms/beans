import type { ValueObjectClassLike } from "@/domain/value-object/types";

/**
 * Whether a blueprint value is a `ValueObject` class rather than a nested
 * `Entity` one — decided structurally, by the `defineMeta` every value-object
 * declares and no entity does, so this helper needs no import from either
 * pillar's base class (and therefore no risk of the circular import that
 * reaching for `Entity` from here would create).
 *
 * Narrows to {@link ValueObjectClassLike}, which is exactly what `metaOf`
 * accepts — so a caller can hand the result straight to it.
 *
 * @param candidate - A blueprint property class.
 * @returns `true` when the class carries a `defineMeta` on its prototype.
 *
 * @example
 * ```ts
 * for (const [key, propertyClass] of Object.entries(properties)) {
 *   // A nested entity has no `[Meta]` to read.
 *   if (!isValueObjectClass(propertyClass)) continue;
 *
 *   const meta = metaOf(propertyClass);
 * }
 * ```
 *
 * @see `metaOf` in `@/domain/value-object/helpers` — what the narrowed value feeds.
 */
export function isValueObjectClass(
	candidate: unknown,
): candidate is ValueObjectClassLike {
	return (
		typeof candidate === "function" &&
		typeof (candidate.prototype as { defineMeta?: unknown } | undefined)
			?.defineMeta === "function"
	);
}
