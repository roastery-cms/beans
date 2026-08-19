/**
 * Every write method name a generated repository can carry.
 *
 * A fixed union, not derived from anything: what a write does is settled by
 * the aggregate's own lifecycle (`create`/`update`/`delete`), not by its
 * blueprint — unlike the read side, where every key adds a method.
 *
 * @example
 * ```ts
 * type WriteOnly = RepositoryOf<typeof User, RepositoryWriteMethods>;
 * // ICanCreate<typeof User> & ICanUpdate<typeof User> & ICanDelete<typeof User>
 * ```
 *
 * @see {@link RepositoryReadMethodsOf} — the read-side counterpart, blueprint-derived.
 * @see {@link RepositoryMethodsOf} — the two of them together.
 */
export type RepositoryWriteMethods = "create" | "update" | "delete";
