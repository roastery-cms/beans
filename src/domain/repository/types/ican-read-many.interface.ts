import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";
import type { RepositoryPage } from "./repository-page.type";

/**
 * The capability of listing entities with no filter at all:
 * `findMany(page)`.
 *
 * **Contract:** an empty table is an empty array, never `null` and never a
 * throw. The {@link RepositoryPage} argument is required — this is the method
 * an unbounded `SELECT *` would hide behind, so the limit is part of the
 * signature rather than a convention the adapter is trusted to remember.
 *
 * Ordering is deliberately unspecified: a port that promised one would be
 * promising something every adapter would have to implement differently
 * (insertion order, `createdAt`, primary-key order), and none of those is
 * derivable from the blueprint. An aggregate that needs a defined order needs
 * a method of its own — see the `Extras` parameter of {@link RepositoryOf}.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadMany<typeof User> };
 *
 * // await deps.users.findMany({ page: 1, perPage: 20 }) → readonly User[]
 * ```
 *
 * @see {@link ICanReadManyBy} — the same read, filtered by one key.
 * @see {@link ICanCount} — the row count the page numbers are relative to.
 */
export interface ICanReadMany<EntityClass extends AnyEntityClass> {
	findMany(
		page: RepositoryPage,
	): Promise<readonly EntityInstanceOf<EntityClass>[]>;
}
