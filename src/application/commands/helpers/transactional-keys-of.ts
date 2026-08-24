import type { CommandsSpecBase } from "@/application/command/types";
import { isTransactional } from "@/application/command/decorators/helpers/is-transactional";

/**
 * Every spec key whose command class declares itself transactional — the
 * `commands`-level counterpart of `uniqueKeysOf`, and for the same reason:
 * a declarative marker is only safe if the declaration stays readable.
 *
 * `commands` never fails on a marked command in a registry without a
 * `transaction` option; it runs the command unwrapped (see `transactional`),
 * so a test wired with `inMemoryRepositoryOf` needs no ceremony. This is what
 * a caller who wants that combination to be *loud* reaches for, so the
 * mismatch surfaces at bootstrap instead of as a half-written aggregate in
 * production:
 *
 * ```ts
 * if (!transaction && transactionalKeysOf(spec).length > 0)
 *   throw new Error("transactional commands registered without a runner");
 * ```
 *
 * Takes the **spec**, not a finished registry, so it can be asked before
 * `withDependencies` — at the point the answer can still change what gets
 * wired.
 *
 * @param spec - The same spec object handed to `commands`.
 * @returns The marked keys, in the spec's own key order. Empty when nothing
 *   is marked, which is the ordinary case.
 *
 * @example
 * ```ts
 * import { transactionalKeysOf } from "@roastery/beans/application/commands";
 *
 * transactionalKeysOf({ placeOrder: PlaceOrder, findOrder: FindOrder });
 * // ["placeOrder"] — FindOrder carries no marker
 * ```
 *
 * @see `transactional` in `@roastery/beans/application/command/decorators` —
 *   what puts a key in this list.
 * @see `uniqueKeysOf` in `@roastery/beans/domain/entity/helpers` — the same
 *   "read the declaration, enforce it elsewhere" shape, one layer down.
 */
export function transactionalKeysOf(spec: CommandsSpecBase): readonly string[] {
	return Object.keys(spec).filter((key) => isTransactional(spec[key]));
}
