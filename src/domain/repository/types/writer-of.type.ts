import type { RepositoryReadMethodPattern } from "./repository-read-method-pattern.type";

/**
 * The write half of an already-resolved repository type — everything
 * {@link ReaderOf} leaves behind.
 *
 * Defined as the **complement** of the read pattern rather than as a positive
 * match on `create`/`update`/`delete`, so that a hand-written mutation
 * (`archive`, `touch`, `reindex`) is classified as a write instead of
 * vanishing from both halves. Guessing "this might mutate" for an unrecognised
 * method is the conservative direction; the two projections partition the
 * repository between them, with nothing dropped.
 *
 * Same variance caveat as {@link ReaderOf}: the projection is checked as an
 * ordinary object type, so method-parameter bivariance no longer applies.
 *
 * @typeParam Repository - The repository type to project.
 *
 * @example
 * ```ts
 * type UserRepository = RepositoryOf<typeof User, "findById" | "create">;
 *
 * type Writes = WriterOf<UserRepository>; // { create(…): … }
 * ```
 *
 * @see {@link ReaderOf} — the complement.
 */
export type WriterOf<Repository extends object> = Omit<
	Repository,
	Extract<keyof Repository, RepositoryReadMethodPattern>
>;
