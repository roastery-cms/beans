/**
 * Every store `inMemoryRepositoryOf` has handed out, keyed by the repository
 * object it belongs to — the link `inMemoryTransactionOf` follows to reach the
 * rows it has to snapshot and restore.
 *
 * A module-level `WeakMap` rather than a property on the repository, because
 * the double's spec applies **at runtime**: `inMemoryRepositoryOf(User,
 * ["findById"])` must produce an object that literally has one method, so a
 * call outside the spec fails in the test run and not only in the compiler.
 * Hanging a `rows` (or a symbol-keyed slot) off that object would put a member
 * on it that no `RepositoryOf` declares — and a locally declared symbol is a
 * thing this package does not have anywhere, since the eight real slots all
 * come from `@roastery/terroir/symbols`.
 *
 * Weak on purpose: an entry lives exactly as long as the repository does, so a
 * suite creating a double per test leaks nothing.
 *
 * Internal. `testing/helpers/` has no barrel, and this is imported by direct
 * path from the two files that make up the pair.
 *
 * @example
 * ```ts
 * rowStores.set(repository, rows);       // in `inMemoryRepositoryOf`
 * const rows = rowStores.get(candidate); // in `inMemoryTransactionOf`
 * ```
 *
 * @see `inMemoryRepositoryOf` — what registers an entry.
 * @see `inMemoryTransactionOf` — what reads one.
 */
export const rowStores = new WeakMap<
	object,
	Map<string, Record<string, unknown>>
>();
