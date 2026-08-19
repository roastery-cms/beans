/**
 * The capability of counting rows: `count()`.
 *
 * **The one contract in this pillar with no type parameter.** It reads no
 * entity, so there is nothing about it that depends on the blueprint — the
 * return is a `number` whatever the aggregate is. The cost of that is honest
 * and worth naming: because `ICanCount` carries no entity, nothing stops a
 * `Deps` slot declaring `ICanCount` from being satisfied by a counter for an
 * entirely different aggregate. A use case that needs to be sure it is
 * counting *its* aggregate should ask for the repository the count comes with
 * (`RepositoryOf<typeof User, "count" | …>`), not for the bare capability.
 *
 * **Contract:** the total number of rows, ignoring any page. It is the number
 * `findMany`'s page arithmetic is relative to.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanCount };
 *
 * const total = await deps.users.count(); // number
 * ```
 *
 * @see {@link ICanReadMany} — the paged read this counts for.
 */
export interface ICanCount {
	count(): Promise<number>;
}
