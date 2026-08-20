import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositorySensitiveKeysOf } from "./repository-sensitive-keys-of.type";

/**
 * The repository method names a sensitive key would have generated, and which
 * therefore must never exist on a port for that entity.
 *
 * `RepositoryFilterKeysOf` already keeps the *generator* from producing them.
 * This type closes the other door: the `Extras` slot, through which a caller
 * declares methods of their own on top of the generated set. Without it, a
 * hand-written extra — or an `inMemoryRepositoryOf` handler — could put
 * `findByPassword` back on a port that deliberately refused to derive it,
 * which would make the suppression a naming convention rather than a rule.
 *
 * **Every** derived half is listed, mirroring how
 * `RepositoryCollectionFilterKeysOf` makes `findBy` and `findManyBy` disappear
 * together. `existsByPassword` matters most of the four: it leaks the secret
 * one bit at a time rather than all at once, which is exactly the shape a
 * suppression that only covered the `find*` halves would have let through.
 *
 * @typeParam EntityClass - The entity whose blueprint declares the secrets.
 *
 * @example
 * ```ts
 * const userProperties = { name: StringVO, password: PasswordVO };
 * class User extends entityOf(userProperties, "user") {}
 *
 * type Forbidden = RepositorySuppressedNamesOf<typeof User>;
 * // "findByPassword" | "findManyByPassword"
 * //   | "countByPassword" | "existsByPassword"
 * ```
 *
 * @see {@link RepositorySensitiveKeysOf} — the keys these names are built from.
 * @see {@link RepositoryFilterKeysOf} — where the generator drops the same keys.
 */
export type RepositorySuppressedNamesOf<EntityClass extends AnyEntityClass> =
	RepositorySensitiveKeysOf<PropertiesOfClass<EntityClass>> extends infer Key
		? Key extends string
			?
					| `findBy${Capitalize<Key>}`
					| `findManyBy${Capitalize<Key>}`
					| `countBy${Capitalize<Key>}`
					| `existsBy${Capitalize<Key>}`
			: never
		: never;
