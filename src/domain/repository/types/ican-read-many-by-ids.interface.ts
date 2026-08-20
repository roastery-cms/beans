import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";

/**
 * The capability of resolving many identities in one round trip:
 * `findManyByIds(ids)`.
 *
 * **Contract — order-preserving, the DataLoader shape.** The returned array
 * has exactly the same length as `ids`, and position *n* holds the entity for
 * `ids[n]` or `null` if there was no match. That is what lets a caller zip the
 * two arrays without a second lookup, and it is the whole reason this exists
 * next to `findManyBy*`: it is a batching primitive, not a query.
 *
 * It takes no {@link RepositoryPageOf} — `ids` already bounds the read, and a
 * page on top of it would silently break the positional guarantee above.
 *
 * Note the name: `findManyByIds` (plural), never `findManyById`. The latter is
 * excluded from the per-key generator on purpose — see
 * {@link RepositoryCollectionFilterKeysOf}. It also wins the name outright: if
 * a blueprint ever declares a key literally called `ids`,
 * {@link RepositoryContractOf} resolves `findManyByIds` to this contract, not
 * to a per-key one.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadManyByIds<typeof User> };
 *
 * const found = await deps.users.findManyByIds(["a", "b"]);
 * // found.length === 2; found[1] is the entity for "b", or null
 * ```
 *
 * @see {@link ICanReadId} — the single-identity lookup.
 */
export interface ICanReadManyByIds<EntityClass extends AnyEntityClass> {
	findManyByIds(
		ids: readonly string[],
	): Promise<readonly (EntityInstanceOf<EntityClass> | null)[]>;
}
