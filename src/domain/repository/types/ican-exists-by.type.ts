import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";
import type { RepositoryFilterValueOf } from "./repository-filter-value-of.type";

/**
 * The capability of asking whether any row carries one value:
 * `existsBy{Key}(value)`, resolving to a boolean.
 *
 * This is the query every `create` guarding a `unique` key already performs.
 * Without it the adapter emulates it with `findBy{Key}` and throws the
 * hydrated entity away — which is a wasted row read, a wasted `fromJSON`, and,
 * worse, a lookup that reads a whole aggregate in order to answer a question
 * about its existence.
 *
 * Unlike {@link ICanCountBy}, `id` **is** a valid `Key` here:
 * {@link RepositoryFilterKeysOf} keeps the identity fields, and `existsById` is
 * a genuinely useful question — the primary-key check `create` makes before an
 * insert.
 *
 * Like {@link ICanReadBy}, the remapping is written over `Key` itself
 * (`[Each in Key as …]`) rather than over the generated names, or a union `Key`
 * would pair every method with every key's value type.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Key - The blueprint key (or union of keys) to test by.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanExistsBy<typeof User, "email"> };
 *
 * // await deps.users.existsByEmail("alan@roastery.dev") → boolean
 * ```
 *
 * @see {@link ICanReadBy} — the same lookup, returning the entity.
 * @see {@link ICanCountBy} — the same filter, returning how many.
 */
export type ICanExistsBy<
	EntityClass extends AnyEntityClass,
	Key extends RepositoryFilterKeysOf<PropertiesOfClass<EntityClass>>,
> = {
	readonly [Each in Key as `existsBy${Capitalize<Each>}`]: (
		value: RepositoryFilterValueOf<PropertiesOfClass<EntityClass>, Each>,
	) => Promise<boolean>;
};
