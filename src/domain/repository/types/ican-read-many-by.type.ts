import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";
import type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
import type { RepositoryFilterValueOf } from "./repository-filter-value-of.type";
import type { RepositoryPage } from "./repository-page.type";

/**
 * The capability of listing entities by one blueprint key:
 * `findManyBy{Key}(value, page)`, resolving to a (possibly empty) array.
 *
 * Like {@link ICanReadBy}, `Key` may be a union and the contract then carries
 * one method per member, each paired with its own value type.
 *
 * **Contract:** no match is an empty array, never `null` and never a throw.
 * The {@link RepositoryPage} argument is required — see that type for why a
 * port here can't offer an unbounded read.
 *
 * `id` is not a valid `Key` here: {@link RepositoryCollectionFilterKeysOf}
 * excludes it, since "many by a unique key" is a contradiction and
 * `findManyById` would sit one character away from `findManyByIds`, which
 * means something entirely different.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Key - The blueprint key (or union of keys) to list by.
 *
 * @example
 * ```ts
 * type Deps = { posts: ICanReadManyBy<typeof Post, "authorId"> };
 *
 * // await deps.posts.findManyByAuthorId(id, { page: 1, perPage: 20 }) → readonly Post[]
 * ```
 *
 * @see {@link ICanReadMany} — the same read without a filter.
 * @see {@link ICanReadManyByIds} — the batch loader, a different contract.
 */
export type ICanReadManyBy<
	EntityClass extends AnyEntityClass,
	Key extends RepositoryCollectionFilterKeysOf<PropertiesOfClass<EntityClass>>,
> = {
	readonly [Each in Key as `findManyBy${Capitalize<Each>}`]: (
		value: RepositoryFilterValueOf<PropertiesOfClass<EntityClass>, Each>,
		page: RepositoryPage,
	) => Promise<readonly EntityInstanceOf<EntityClass>[]>;
};
