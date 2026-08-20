import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
import type { RepositoryFilterValueOf } from "./repository-filter-value-of.type";

/**
 * The capability of counting rows matching one blueprint key:
 * `countBy{Key}(value)`, resolving to a number.
 *
 * This is what {@link ICanCount} cannot answer. `count()` takes no filter, so a
 * filtered list has a page size and a page number but no total — the screen
 * showing "page 2 of ?" has no way to fill in the second half. `countByX` comes
 * out of the same generator as `findManyByX` and inherits its key set, so the
 * two always agree on which filters exist.
 *
 * `id` is not a valid `Key` here: {@link RepositoryCollectionFilterKeysOf}
 * excludes it, and for the same reason it excludes `findManyById` — counting by
 * a primary key is a question whose answer is always 0 or 1, which is
 * {@link ICanExistsBy}'s job, phrased honestly.
 *
 * Like {@link ICanReadBy}, the remapping is written over `Key` itself
 * (`[Each in Key as …]`) rather than over the generated names. With `Key` a
 * union the second form loses the pairing and every method would take the union
 * of every key's value type.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Key - The blueprint key (or union of keys) to count by.
 *
 * @example
 * ```ts
 * type Deps = { posts: ICanCountBy<typeof Post, "authorId"> };
 *
 * // await deps.posts.countByAuthorId(id) → number
 * ```
 *
 * @see {@link ICanCount} — the unfiltered count.
 * @see {@link ICanReadManyBy} — the rows this counts.
 */
export type ICanCountBy<
	EntityClass extends AnyEntityClass,
	Key extends RepositoryCollectionFilterKeysOf<PropertiesOfClass<EntityClass>>,
> = {
	readonly [Each in Key as `countBy${Capitalize<Each>}`]: (
		value: RepositoryFilterValueOf<PropertiesOfClass<EntityClass>, Each>,
	) => Promise<number>;
};
