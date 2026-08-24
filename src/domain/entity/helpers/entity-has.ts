import { propertyMatches } from "@/shared/helpers/property-matches";
import type { EntityHas, EntityHasShapeBase } from "../types";
import type { AnyEntityClass } from "../types/any-entity-class.type";
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
