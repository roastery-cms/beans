import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";
import type { RepositoryPageOf } from "./repository-page-of.type";

/**
 * The capability of listing entities with no filter at all:
 * `findMany(page)`.
 *
 * **Contract:** an empty table is an empty array, never `null` and never a
 * throw. The {@link RepositoryPageOf} argument is required — this is the method
 * an unbounded `SELECT *` would hide behind, so the limit is part of the
 * signature rather than a convention the adapter is trusted to remember.
 *
 * **Ordering is part of that argument, not left to the adapter.** It used to be
 * deliberately unspecified, on the grounds that a port promising an order would
 * be promising something every adapter implements differently (insertion order,
 * `createdAt`, primary-key order) and none of it derivable from the blueprint.
 * The second half of that turned out to be wrong: the blueprint *does* say
 * which keys carry a scalar, which is exactly the set an order may be declared
 * over (see {@link RepositoryOrderKeysOf}). And the first half was the problem,
 * not the justification — an unordered page is an indeterminate page, and the
 * in-memory double happens to hide it while a real database does not.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadMany<typeof User> };
 *
 * // await deps.users.findMany({
 * //   page: 1, perPage: 20, orderBy: "createdAt", direction: "desc",
 * // }) → readonly User[]
 * ```
 *
 * @see {@link ICanReadManyBy} — the same read, filtered by one key.
 * @see {@link ICanCount} — the row count the page numbers are relative to.
 */
export interface ICanReadMany<EntityClass extends AnyEntityClass> {
	findMany(
		page: RepositoryPageOf<EntityClass>,
	): Promise<readonly EntityInstanceOf<EntityClass>[]>;
}
