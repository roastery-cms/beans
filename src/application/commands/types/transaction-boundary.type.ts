/**
 * `commands`' `transaction` option: a function that runs one unit of work
 * inside a transaction and resolves with whatever the work resolved to.
 *
 * A **function**, not the `ITransactionRunner` object itself, so that nothing
 * in `application/` has to name a type from `domain/repository` — and so that
 * an adapter with a different shape (a `db.transaction(fn)` method, a
 * decorated runner, a per-tenant router picking one of several pools) fits
 * without an intermediate class. Building it from a runner is one arrow:
 * `(work) => runner.run(work)`.
 *
 * `commands` calls it around a marked command's `execute()` and nothing else.
 * A rejection propagates untouched to that command's caller, since it is the
 * failure the caller has to see; on that path the events the command may have
 * raised are never reached, so a rolled-back operation publishes nothing.
 *
 * @typeParam T - What the unit of work resolves to. Generic on the *call*,
 *   not on this alias, so one boundary serves every command in a spec
 *   regardless of what each resolves to.
 *
 * @example
 * ```ts
 * const registry = commands(spec, { transaction: (work) => runner.run(work) })
 *   .withDependencies(deps);
 *
 * // in tests, the boundary that changes nothing:
 * commands(spec, { transaction: (work) => work() });
 * ```
 *
 * @see `ITransactionRunner` in `@roastery/beans/domain/repository/types` — the
 *   object contract this is usually a one-line adapter over.
 * @see `transactional` in `@roastery/beans/application/command/decorators` —
 *   the marker deciding which commands this is called around.
 */
export type TransactionBoundary = <T>(work: () => Promise<T>) => Promise<T>;
