import type { AnyEntityClass } from "./any-entity-class.type";
import type { DomainKeys } from "./domain-keys.type";
import type { EntityHasShapeBase } from "./entity-has-shape-base.type";
import type { MatchingEntityHasKeys } from "./matching-entity-has-keys.type";

/**
 * Whether `EntityType`'s blueprint carries every key of `ExpectedShape`, each
 * backed by that key's declared class — or a subclass of it, such as a
 * domain-vocabulary alias (`class TagSlug extends SlugVO {}`) that adds
 * nothing of its own. Resolves to the boolean literal `true` or `false`, never
 * a union of the two, so it composes directly with a conditional type.
 *
 * A compile-time-only, **class** check across all four blueprint kinds — a
 * value-object, a nested `Entity`, a nested `DomainRecord` or a multiplicity
 * wrapper around one of those three. Nothing here runs; there is no function
 * backing this type, only the static analysis that resolves it at the call
 * site.
 *
 * **Multiplicity is part of the shape.** `{ tags: typeof PostTag }` does not
 * match a blueprint declaring `tags: arrayOf(PostTag)` — write the wrapper the
 * blueprint writes. See {@link PropertyClassMatches}, which owns that rule.
 *
 * An `ExpectedShape` with no keys resolves to `true` — vacuously, there is
 * nothing to fail.
 *
 * @typeParam EntityType - The concrete `Entity` subclass to inspect, e.g. `typeof Post`.
 * @typeParam ExpectedShape - The keys and classes to check for, e.g. `{ slug: typeof SlugVO }`.
 *
 * @example
 * ```ts
 * import { blueprint, entityOf } from "@roastery/beans/domain/entity/helpers";
 * import { arrayOf, optionalOf } from "@roastery/beans/domain/wrapper/helpers";
 * import type { EntityHas } from "@roastery/beans/domain/entity/types";
 * import { SlugVO, StringVO, UuidVO } from "@roastery/beans/domain/collections/value-objects";
 *
 * // Domain vocabulary: adds nothing of its own, same pattern the blueprint
 * // docs use for TagName/TagSlug.
 * class PostAuthorId extends UuidVO {}
 *
 * const postTags = arrayOf(PostTag);
 * const postType = optionalOf(PostType);
 *
 * const postProperties = blueprint({
 *   title: StringVO,
 *   slug: SlugVO,
 *   authorId: PostAuthorId,
 *   tags: postTags,
 *   type: postType,
 * }).done();
 *
 * class Post extends entityOf(postProperties, "post") {}
 *
 * type HasSlug = EntityHas<typeof Post, { slug: typeof SlugVO }>; // true
 * type HasAuthorId = EntityHas<typeof Post, { authorId: typeof UuidVO }>; // true — PostAuthorId is a UuidVO subclass
 * type HasTags = EntityHas<typeof Post, { tags: typeof postTags }>; // true — same kind, same inner class
 * type HasType = EntityHas<typeof Post, { type: typeof postType }>; // true
 * type HasBareType = EntityHas<typeof Post, { type: typeof PostType }>; // false — the key holds an optionalOf, not a PostType
 * type HasWrongClass = EntityHas<typeof Post, { title: typeof SlugVO }>; // false — title is a StringVO
 * type HasMissingKey = EntityHas<typeof Post, { publishedAt: typeof UuidVO }>; // false — no such key
 *
 * // The intended use: gate a generated repository method on the shape it needs.
 * type PostRepository = EntityHas<typeof Post, { authorId: typeof UuidVO }> extends true
 *   ? { findByAuthorId(id: string): Promise<Post | null> }
 *   : {};
 * ```
 *
 * @see {@link MatchingEntityHasKeys} — the OR-collapse union this narrows to
 *   a single boolean.
 * @see {@link PropertyClassMatches} — the per-key rule, across the four kinds.
 * @see {@link EntityHasShapeBase} — the base constraint of `ExpectedShape`.
 */
export type EntityHas<
	EntityType extends AnyEntityClass,
	ExpectedShape extends EntityHasShapeBase,
> =
	DomainKeys<ExpectedShape> extends MatchingEntityHasKeys<
		EntityType,
		ExpectedShape
	>
		? true
		: false;
