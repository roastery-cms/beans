import type { AnyEntityClass } from "./any-entity-class.type";
import type { DomainKeys } from "./domain-keys.type";
import type { EntityHasShapeBase } from "./entity-has-shape-base.type";
import type { MatchingEntityHasKeys } from "./matching-entity-has-keys.type";

/**
 * Whether `EntityType`'s blueprint carries every key of `ExpectedShape`,
 * each backed by that key's declared `ValueObject` class — or a subclass of
 * it, such as a domain-vocabulary alias (`class TagSlug extends SlugVO {}`)
 * that adds nothing of its own. Resolves to the boolean literal `true` or
 * `false`, never a union of the two, so it composes directly with a
 * conditional type.
 *
 * A compile-time-only, VO-**class** check: it compares `ExpectedShape`'s
 * classes against the entity's blueprint classes, never a runtime value.
 * Nothing here runs — there is no function backing this type, only the
 * static analysis that resolves it at the call site.
 *
 * An `ExpectedShape` with no keys resolves to `true` — vacuously, there is
 * nothing to fail.
 *
 * @typeParam EntityType - The concrete `Entity` subclass to inspect, e.g. `typeof Post`.
 * @typeParam ExpectedShape - The keys and VO classes to check for, e.g. `{ slug: typeof SlugVO }`.
 *
 * @example
 * ```ts
 * import { Entity } from "@roastery/beans";
 * import type { AccessorsOf, EntityDefinition, EntityHas } from "@roastery/beans/domain/entity/types";
 * import { SlugVO, StringVO, UuidVO } from "@roastery/beans/domain/collections/value-objects";
 *
 * // Domain vocabulary: adds nothing of its own, same pattern the blueprint
 * // docs use for TagName/TagSlug.
 * class PostAuthorId extends UuidVO {}
 *
 * const postProperties = { title: StringVO, slug: SlugVO, authorId: PostAuthorId };
 *
 * // biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
 * interface Post extends AccessorsOf<typeof postProperties> {}
 * class Post extends Entity<typeof postProperties> {
 *   protected defineEntity(): EntityDefinition<typeof postProperties> {
 *     return { properties: postProperties, source: "post" };
 *   }
 * }
 *
 * type HasSlug = EntityHas<typeof Post, { slug: typeof SlugVO }>; // true
 * type HasAuthorId = EntityHas<typeof Post, { authorId: typeof UuidVO }>; // true — PostAuthorId is a UuidVO subclass
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
