/**
 * Which half of a repository a generated port exposes.
 *
 * Used as {@link RepositoryOf}'s third type argument, where it filters the
 * selection **at the source** — a `Mode` of `"read"` drops every write from
 * the spec before the contracts are assembled, so the result has no `create`
 * to be called by mistake, rather than one that is merely discouraged.
 *
 * The default is the whole union (`"read" | "write"`), which every mode test
 * in this pillar satisfies — filtering only happens when a caller narrows it.
 *
 * @example
 * ```ts
 * type Full = RepositoryOf<typeof User, "findById" | "create">;
 * type ReadHalf = RepositoryOf<typeof User, "findById" | "create", "read">; // findById only
 * ```
 *
 * @see {@link ReaderOf} — the same split as a projection over an existing repository.
 */
export type RepositoryMode = "read" | "write";
