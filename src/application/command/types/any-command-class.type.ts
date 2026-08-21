import type { CommandResult } from "./command-result.type";

/**
 * Widest `Command` **class** type: something whose instances resolve
 * `execute()` to a {@link CommandResult} and whose constructor takes a
 * payload.
 *
 * Built entirely from `Command`'s already-**public** surface ({@link CommandResult}
 * alone) — no reach into `application/command`'s internals is needed, since
 * `execute`'s parameter/return shape and the constructor's parameter shape
 * are both recovered structurally, via `infer`, on the concrete substituted
 * class, never on this widened bound itself. `never` in both slots is the
 * same "widest possible contravariant bound" idiom `AnyValueObjectClass`/
 * `AnyEntityClass` already use: it makes every real `Command` subclass —
 * regardless of its actual `Deps`/payload — satisfy this bound, while the
 * real types are recovered afterwards from the concrete class.
 *
 * @see `CommandRegistrySpecBase` — the spec built from a record of these.
 */
export type AnyCommandClass = {
	readonly prototype: {
		execute(deps: never): Promise<CommandResult<unknown>>;
	};
	new (
		payload: never,
	): {
		execute(deps: never): Promise<CommandResult<unknown>>;
	};
};
