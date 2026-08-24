/**
 * @module @roastery/beans/testing
 *
 * The batteries a test needs: doubles generated from the same blueprints the
 * rest of the package derives everything else from, plus the adapters that
 * would otherwise be retyped at every call site.
 *
 * **Not a layer.** `domain` and `application` are still the only two —
 * `testing` is a time-of-use concern, the way `way` is a ceremony concern and
 * `shared` an internals one. It sits behind its own subpath so a production
 * bundle never reaches it by accident, and it is deliberately absent from
 * `@roastery/beans/way`, which curates the low-ceremony subset of *production*
 * entry points.
 *
 * It is also the first place in `beans` with runtime outside the two layers.
 * The `repository` pillar it doubles stays type-only and emits zero bytes; the
 * one implementation of that port lives here.
 *
 * It imports no Node builtin — that belongs to `@roastery/beans/node`, which
 * `NodeEventEmitterAdapter` moved to. Keeping the two apart is what lets this
 * subpath mean "for tests" without also meaning "needs a Node host".
 *
 * Re-exports:
 * - {@link inMemoryRepositoryOf} — an in-memory repository for one entity,
 *   generated from its blueprint and typed as the `RepositoryOf` port a real
 *   adapter would implement.
 * - {@link inMemoryTransactionOf} — a transaction runner over those
 *   repositories, typed as the `ITransactionRunner` port the same way, so a
 *   `transactional` command can be tested for what a rollback actually undoes
 *   rather than only for the order in which the boundary closes.
 */

export { inMemoryRepositoryOf } from "./in-memory-repository-of";
export { inMemoryTransactionOf } from "./in-memory-transaction-of";
