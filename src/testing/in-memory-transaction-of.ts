import type { ITransactionRunner } from "@/domain/repository/types";
import { DependencyNotWiredException } from "@roastery/terroir/exceptions/infra";
import { REPOSITORY_SOURCE } from "./helpers/repository-source";
import { rowStores } from "./helpers/row-stores";

/** One stored record: exactly what `toJSON()` produced, kept loose internally. */
type Row = Record<string, unknown>;

/**
 * Builds a transaction runner over one or more repositories produced by
 * `inMemoryRepositoryOf`, typed as the very same `ITransactionRunner` port a
 * real adapter implements — the same posture the repository double takes
 * towards `RepositoryOf`.
 *
 * It exists because the no-op boundary a test could already write,
 * `{ transaction: (work) => work() }`, proves the *ordering* claim
 * (`COMMIT` → `emit` → react) and nothing else: a `create` performed by a
 * `transactional` command that then fails stays in the store, so the one thing
 * the boundary exists to guarantee is exactly the thing a test could not
 * assert. This runner rolls the rows back, so it can.
 *
 * @param repositories - The in-memory repositories taking part in the
 *   transaction. Scope is explicit: a double left out of this list is not
 *   rolled back.
 * @returns A runner whose `run` commits on resolve and restores every listed
 *   store on reject.
 *
 * @throws {DependencyNotWiredException} When called with no repository at all,
 *   or with an object `inMemoryRepositoryOf` did not build — both are runners
 *   that would silently roll nothing back.
 *
 * @example
 * ```ts
 * import { inMemoryRepositoryOf, inMemoryTransactionOf } from "@roastery/beans/testing";
 *
 * const users = inMemoryRepositoryOf(User);
 * const orders = inMemoryRepositoryOf(Order);
 * const runner = inMemoryTransactionOf(users, orders);
 *
 * const registry = commands(spec, {
 *   transaction: (work) => runner.run(work),
 * }).withDependencies({ users, orders });
 *
 * // `PlaceOrder` is `@transactional` and throws after creating the order
 * await expect(registry.placeOrder(payload)).rejects.toThrow();
 * expect(await orders.count()).toBe(0); // rolled back, and nothing published
 * ```
 *
 * Key rules:
 *
 * - **It rolls back rows, never entities.** There is no change tracking and no
 *   identity map here, the same way there is none in `beans` at large: an
 *   entity you mutated inside a `handle` keeps its new values after a rollback,
 *   because only `repository.update(entity)` ever wrote anything. That is the
 *   bug the double exists to catch, and a rollback must not start hiding it.
 * - **A nested `run` joins the open transaction** rather than opening a second
 *   one, so only the outermost call snapshots and restores. `commands` already
 *   opens a boundary only at the outermost marked command; this makes a
 *   hand-written nested `run` behave the same way, and is why the runner never
 *   has to be reentrant.
 * - **Reads inside the transaction see its own writes** (read-your-writes,
 *   like a real database). Nothing here models isolation between concurrent
 *   connections — a second "session" would see uncommitted rows. That is the
 *   third documented infidelity of this pillar, next to UTF-16 string ordering
 *   and base64-ordered binary keys.
 * - **The rejection propagates untouched**, never wrapped: it is the failure
 *   the caller has to see, and it is what stops `commands` before the
 *   publication loop, so a rolled-back operation emits nothing.
 * - **The snapshot is a deep clone**, so a rollback also undoes an in-place
 *   mutation made through a handler's `context.rows`.
 *
 * @see `ITransactionRunner` in `@roastery/beans/domain/repository/types` — the port this satisfies.
 * @see `inMemoryRepositoryOf` — what builds the repositories this takes.
 * @see `transactional` in `@roastery/beans/application/command/decorators` —
 *   the marker deciding which commands a boundary is opened around.
 */
export function inMemoryTransactionOf(
	...repositories: readonly object[]
): ITransactionRunner {
	if (repositories.length === 0)
		throw new DependencyNotWiredException(
			REPOSITORY_SOURCE,
			"inMemoryTransactionOf needs at least one repository to roll back. A boundary that restores nothing is `(work) => work()`.",
		);

	// Resolved once, at construction: a repository cannot start or stop being
	// one between calls, and a wiring mistake should fail where the runner is
	// built rather than inside the first command that happens to use it.
	const stores: readonly Map<string, Row>[] = repositories.map((repository) => {
		const rows = rowStores.get(repository);

		if (rows === undefined)
			throw new DependencyNotWiredException(
				REPOSITORY_SOURCE,
				"inMemoryTransactionOf takes repositories built by inMemoryRepositoryOf; this argument has no in-memory store behind it.",
			);

		return rows;
	});

	let depth = 0;

	return {
		async run<T>(work: () => Promise<T>): Promise<T> {
			// Already inside one: join it. Snapshotting again would make the
			// inner call restore to a state the outer transaction produced,
			// turning one business operation into two — the trap that keeps
			// `commands` from opening a boundary below the outermost marked
			// command.
			if (depth > 0) {
				depth += 1;

				try {
					return await work();
				} finally {
					depth -= 1;
				}
			}

			// Paired with its store, so restoring needs no index arithmetic.
			// `structuredClone` copies the whole `Map` — keys, rows and every
			// nested aggregate inside them — which is what makes the rollback
			// total rather than one level deep.
			const snapshots = stores.map(
				(rows) => [rows, structuredClone(rows)] as const,
			);

			depth += 1;

			try {
				return await work();
			} catch (error) {
				for (const [rows, snapshot] of snapshots) {
					rows.clear();

					for (const [id, row] of snapshot) rows.set(id, row);
				}

				throw error;
			} finally {
				depth -= 1;
			}
		},
	};
}
