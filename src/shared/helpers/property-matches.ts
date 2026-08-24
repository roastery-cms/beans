import type { AnyPropertyClass } from "@/domain/entity/types/any-property-class.type";
import { isWrapperClass } from "./is-wrapper-class";

/**
 * Whether one blueprint property class satisfies another — the runtime half of
 * `PropertyClassMatches`, and it has to answer the same way.
 *
 * A wrapper is compared **structurally**, by its multiplicity and by what it
 * wraps, because it cannot be compared by identity: every `arrayOf(PostTag)`
 * call mints a fresh class, so the one in the blueprint and the one a caller
 * writes in the argument are never the same object and never share a prototype
 * chain. The two statics are the only thing both halves of the package read
 * off a wrapper, so they are what this reads too.
 *
 * The unwrapped kinds fall out of a plain `instanceof` check against the real
 * prototype chain — the same discriminant the base already uses at runtime,
 * and what accepts a domain-vocabulary subclass in all three of them.
 *
 * That check is by **identity**, which is stricter than the type level can be:
 * two classes minted by separate factory calls with identical arguments
 * (`customRecordVO()` twice) are one type and two objects, so `PropertyClassMatches`
 * says `true` here and this says `false`. Call a class-returning factory once,
 * at module scope, and the question never arises — the same rule that governs
 * putting one in a blueprint.
 *
 * Shared rather than duplicated for the reason `cycleError` is: two consumers
 * now ask this question and two copies would only guarantee that a fix to one
 * silently misses the other.
 *
 * @param actual - The class the blueprint declares for the key.
 * @param expected - The class the caller asserts the key is backed by.
 * @returns `true` when `actual` is `expected` or a subclass of it, or when
 *   both are wrappers of the same kind whose inner classes match by this rule.
 *
 * @example
 * ```ts
 * propertyMatches(PostAuthorId, UuidVO); // true — a domain-vocabulary subclass
 * propertyMatches(postProperties.tags, arrayOf(PostTag)); // true — same kind, same inner
 * propertyMatches(PostTag, arrayOf(PostTag)); // false — multiplicity is part of the shape
 * ```
 *
 * @see `PropertyClassMatches` in `@/domain/entity/types/property-class-matches.type` —
 *   the compile-time half, where the semantics are documented.
 * @see `entityHas` in `@/domain/entity/helpers/entity-has` — asks this per key
 *   of an expected shape.
 * @see `reshapeTo` in `@/domain/entity/helpers/reshape-to` — asks this at the
 *   value-object leaf only, because its nested question is a structural one.
 */
export function propertyMatches(actual: unknown, expected: unknown): boolean {
	if (isWrapperClass(expected))
		return (
			isWrapperClass(actual) &&
			actual.wrapperKind === expected.wrapperKind &&
			propertyMatches(actual.wraps, expected.wraps)
		);

	// A wrapped key never satisfies an unwrapped expectation: multiplicity is
	// part of the shape, exactly as it is at the type level.
	if (isWrapperClass(actual)) return false;

	return (
		actual === expected ||
		(actual as AnyPropertyClass).prototype instanceof
			(expected as AnyPropertyClass)
	);
}
