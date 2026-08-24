import { isWrapperClass } from "@/shared/helpers/is-wrapper-class";
import type { EntityHas, EntityHasShapeBase } from "../types";
import type { AnyEntityClass } from "../types/any-entity-class.type";
import type { AnyPropertyClass } from "../types/any-property-class.type";
import { definitionOf } from "./read-definition";

/**
 * Runtime counterpart of the `EntityHas` type: whether `entityClass`'s
 * blueprint carries every key of `expectedShape`, each backed by that key's
 * declared class — or a subclass of it, such as a domain-vocabulary alias
 * (`class PostAuthorId extends UuidVO {}`) that adds nothing of its own.
 *
 * Answers for all four blueprint kinds: a value-object, a nested `Entity`, a
 * nested `DomainRecord` and a multiplicity wrapper around one of those three.
 *
 * Reads the blueprint via `definitionOf`, the same probe-based mechanism
 * `Entity.fromJSON` itself uses — no instance is constructed.
 *
 * **The wrapper in `expectedShape` is read, never used.** Only its two statics
 * are inspected (`wraps` and `wrapperKind`); nothing is constructed and no
 * schema is derived. So an inline `arrayOf(PostTag)` in the argument is safe
 * here, unlike in a blueprint, where the usual rule holds — call a
 * class-returning factory once, at module scope. A caller checking in a hot
 * path can hand over the blueprint's own class (`postProperties.tags`)
 * instead of minting one per call.
 *
 * @typeParam EntityType - The concrete `Entity` subclass to inspect.
 * @typeParam ExpectedShape - The keys and classes to check for.
 *
 * @param entityClass - The entity class to inspect, e.g. `Post`.
 * @param expectedShape - The keys and classes to check for, e.g. `{ slug: SlugVO }`.
 * @returns `true` when every key of `expectedShape` is present and backed by
 *   a matching (or subclassing) class.
 *
 * @example
 * ```ts
 * import { entityHas } from "@roastery/beans/domain/entity/helpers";
 * import { arrayOf, optionalOf } from "@roastery/beans/domain/wrapper/helpers";
 *
 * // blueprint: { slug: SlugVO, authorId: PostAuthorId, tags: arrayOf(PostTag), type: optionalOf(PostType) }
 *
 * entityHas(Post, { slug: SlugVO }); // true
 * entityHas(Post, { authorId: UuidVO }); // true — PostAuthorId is a UuidVO subclass
 * entityHas(Post, { tags: arrayOf(PostTag) }); // true — a fresh wrapper class still matches
 * entityHas(Post, { type: optionalOf(PostType) }); // true
 * entityHas(Post, { type: PostType }); // false — the key holds an optionalOf, not a PostType
 * entityHas(Post, { publishedAt: UuidVO }); // false — no such key
 * ```
 *
 * @see `EntityHas` in `../types/entity-has.type` — the compile-time counterpart this mirrors.
 */
export function entityHas<
	EntityType extends AnyEntityClass,
	ExpectedShape extends EntityHasShapeBase,
>(
	entityClass: EntityType,
	expectedShape: ExpectedShape,
): EntityHas<EntityType, ExpectedShape> {
	const { properties } = definitionOf(entityClass);

	const matches = Object.entries(expectedShape).every(
		([key, expectedClass]) =>
			Object.hasOwn(properties, key) &&
			propertyMatches(properties[key], expectedClass),
	);

	return matches as EntityHas<EntityType, ExpectedShape>;
}

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
 * @param actual - The class the blueprint declares for the key.
 * @param expected - The class the caller asserts the key is backed by.
 * @returns `true` when `actual` is `expected` or a subclass of it, or when
 *   both are wrappers of the same kind whose inner classes match by this rule.
 *
 * @see `PropertyClassMatches` in `../types/property-class-matches.type` — the
 *   compile-time half, where the semantics are documented.
 */
function propertyMatches(actual: unknown, expected: unknown): boolean {
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
