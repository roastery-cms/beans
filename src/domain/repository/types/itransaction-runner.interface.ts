/**
 * The minimal, structural contract a **transactional boundary** is adapted
 * to: run one unit of work, commit it if the work resolves, roll it back if
 * the work rejects. `beans` implements no transaction of its own — this is
 * the whole surface an adapter needs to satisfy, implemented outside the
 * package (wrapping Prisma's `$transaction`, a Drizzle `db.transaction`, a
 * raw `BEGIN`/`COMMIT` pair, …).
 *
 * **Named `ITransactionRunner`, never `IUnitOfWork`.** The canonical Unit of
 * Work bundles three things — the business-operation scope, the flush of
 * effects at commit, and change tracking with an identity map. `beans`
 * already covers the first two in its own shapes (`Command`/`AggregateCommand`
 * is the scope; `raiseEvent` → `pullDomainEvents` → `CommandResult` is the
 * flush) and **refuses the third on purpose**: the persistence unit here is
 * the whole aggregate serialized through `toJSON`, not normalized rows, so
 * dirty checking would buy almost nothing and would cost the guarantee that
 * `inMemoryRepositoryOf` implements the very same `RepositoryOf` port a real
 * adapter does. Someone arriving with EF Core or Hibernate behind them reads
 * `IUnitOfWork` and expects `user.rename("x")` inside a `handle` to be saved
 * by the commit. It is not. The name would invite exactly the bug the
 * in-memory double exists to catch — the same reasoning that keeps
 * `EntityStorage` (a class) distinct from `Storage` (a symbol).
 *
 * **Repositories only join the transaction if the adapter makes them.** This
 * interface hands the runner a `work` callback and nothing else; it does not,
 * and cannot, thread a connection into the repositories the work calls. On
 * Node that plumbing is `AsyncLocalStorage`. Without it a repository writes
 * through the global connection, the `ROLLBACK` never reaches the `INSERT`,
 * and inconsistent state ships with a false sense of protection.
 *
 * @example
 * ```ts
 * const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();
 *
 * class PrismaTransactionRunner implements ITransactionRunner {
 *   public constructor(private readonly prisma: PrismaClient) {}
 *   public async run<T>(work: () => Promise<T>): Promise<T> {
 *     return this.prisma.$transaction((tx) => transactionContext.run(tx, work));
 *   }
 * }
 *
 * class PrismaUserRepository {
 *   private get db() {
 *     return transactionContext.getStore() ?? this.prisma; // inside? use the tx
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // In tests, the no-op runner is one line — every assertion still holds.
 * const runner: ITransactionRunner = { run: (work) => work() };
 * ```
 *
 * @see `commands` in `@roastery/beans/application/commands` — its `transaction`
 *   option is where a runner is handed over, as `(work) => runner.run(work)`.
 * @see `transactional` in `@roastery/beans/application/command/decorators` —
 *   the marker declaring *which* commands a configured runner wraps.
 */
export interface ITransactionRunner {
	/**
	 * Runs one unit of work inside a transaction, resolving with whatever the
	 * work resolved to and rejecting — after rolling back — with whatever it
	 * threw.
	 *
	 * Called once per transactional command dispatch, around that command's
	 * `execute()` alone. Publishing and reactions deliberately happen
	 * *outside*, after this resolves, so a committed operation is never undone
	 * by a failing e-mail and no e-mail is ever sent for an operation that
	 * rolled back.
	 *
	 * @typeParam T - What the unit of work resolves to — `CommandResult<…>`
	 *   when `commands` is the caller, though nothing here requires that.
	 * @param work - The unit of work. Must be invoked exactly once.
	 * @returns The work's own resolved value, once the transaction committed.
	 * @throws Whatever `work` threw, after the rollback — the failure must not
	 *   be swallowed, since it is what the command's caller sees.
	 */
	run<T>(work: () => Promise<T>): Promise<T>;
}
