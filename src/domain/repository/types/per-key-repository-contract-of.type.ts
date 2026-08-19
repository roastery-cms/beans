import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { ICanReadBy } from "./ican-read-by.type";
import type { ICanReadManyBy } from "./ican-read-many-by.type";
import type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";

/**
 * Resolves one blueprint-derived method name back to the contract that
 * declares it — `"findByEmail"` to `ICanReadBy<EntityClass, "email">`.
 *
 * Goes **forward**, not backward: it maps over the filter keys, generates each
 * one's method name, and collapses by indexing on the key that matched. The
 * obvious alternative — recovering the key from the name with
 * `Uncapitalize<Name extends \`findBy${infer Key}\` ? Key : never>` — breaks
 * the moment a key is not plain camelCase, since `Capitalize`/`Uncapitalize`
 * are not inverses there (`URL` capitalizes to `URL` and uncapitalizes to
 * `uRL`, which is not a blueprint key). Generating forward can only ever
 * produce names the catalog actually contains.
 *
 * `findManyBy…` is tested **before** `findBy…`: every `findManyByX` also
 * matches the `findBy${string}` shape via the key `ManyByX`, so the narrower
 * pattern has to win first.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Name - The method name to resolve.
 *
 * @see {@link RepositoryContractOf} — the dispatcher that falls through to this.
 */
export type PerKeyRepositoryContractOf<
	EntityClass extends AnyEntityClass,
	Name,
> = {
	[Key in RepositoryFilterKeysOf<
		PropertiesOfClass<EntityClass>
	>]: Name extends `findManyBy${Capitalize<Key>}`
		? Key extends RepositoryCollectionFilterKeysOf<
				PropertiesOfClass<EntityClass>
			>
			? ICanReadManyBy<EntityClass, Key>
			: never
		: Name extends `findBy${Capitalize<Key>}`
			? ICanReadBy<EntityClass, Key>
			: never;
}[RepositoryFilterKeysOf<PropertiesOfClass<EntityClass>>];
