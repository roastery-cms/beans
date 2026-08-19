/**
 * The name shape {@link ReaderOf} treats as a read: anything starting with
 * `find`, plus `count`.
 *
 * A *pattern*, not the catalog, and that is the point — `ReaderOf` projects
 * over an already-resolved repository type, including one written by hand with
 * methods no blueprint generates (`findByTenantAndSlug`, `findArchived`). A
 * pattern keeps working for those; matching against
 * {@link RepositoryReadMethodsOf} would silently drop them.
 *
 * The consequence is worth stating plainly: a hand-written method whose name
 * does not start with `find` is not seen as a read, and lands on the
 * {@link WriterOf} side instead, since that half is defined as the complement.
 * Defaulting an unrecognised method to "may mutate" is the safe direction.
 *
 * @see {@link ReaderOf} — the only consumer.
 */
export type RepositoryReadMethodPattern = `find${string}` | "count";
