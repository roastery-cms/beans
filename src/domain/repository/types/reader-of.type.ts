import type { RepositoryReadMethodPattern } from "./repository-read-method-pattern.type";

/**
 * The read half of an already-resolved repository type.
 *
 * A **projection**, where {@link RepositoryMode} is a filter at the source —
 * and the two answer different questions. `RepositoryOf<…, "read">` builds a
 * port that never had a `create` to begin with; `ReaderOf` narrows a port that
 * already exists, including one written entirely by hand, and is what a use
 * case reaches for when it is handed a full repository but should only be
 * trusted to read from it.
 *
 * Membership is decided by name shape ({@link RepositoryReadMethodPattern}),
 * not by the generated catalog, so a hand-written `findArchived` comes along.
 * The flip side is that anything not matching lands on the {@link WriterOf}
 * side, which is the safe direction to guess in.
 *
 * `Pick` hardens variance: the picked members keep their declarations, but
 * assignability of the projection is checked as an ordinary object type, so a
 * method's bivariant parameters no longer get TypeScript's method carve-out.
 *
 * @typeParam Repository - The repository type to project.
 *
 * @example
 * ```ts
 * type UserRepository = RepositoryOf<typeof User, "findById" | "create">;
 *
 * type Reads = ReaderOf<UserRepository>; // { findById(…): … }
 * ```
 *
 * @see {@link WriterOf} — the complement.
 */
export type ReaderOf<Repository extends object> = Pick<
	Repository,
	Extract<keyof Repository, RepositoryReadMethodPattern>
>;
