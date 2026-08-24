/**
 * Whether a command class carries the `transactional` marker — the reading
 * half of what the `transactional` decorator stamps.
 *
 * Reads a plain `static` property rather than a symbol slot, deliberately.
 * The marker says one boolean about the class and nothing about an instance,
 * so it needs no collision-proof key of its own; and a symbol here would have
 * to come from `@roastery/terroir/symbols` (never declared locally), which is
 * a change to another package for a flag `commandOf`'s own
 * `static readonly definition` already shows how to carry.
 *
 * Structural, so it sees the marker on a class that declared
 * `static readonly transactional = true` by hand just as well as on a
 * decorated one — the decorator is the ergonomic form, not a gate. Inherited
 * statics count: a subclass of a marked command is marked too, which is the
 * same posture `static readonly definition` already takes.
 *
 * @param commandClass - The candidate, `unknown` because the callers reach it
 *   through an index access over a generic spec and would otherwise have to
 *   prove a shape that is not there to prove.
 * @returns `true` only for a strictly `true` marker — a truthy value that is
 *   not `true` is a different property that happens to share the name, and is
 *   read as unmarked.
 *
 * @example
 * ```ts
 * isTransactional(PlaceOrder);   // true — `@transactional class PlaceOrder …`
 * isTransactional(FindUserById); // false
 * ```
 *
 * @see `transactional` — what stamps the marker this reads.
 * @see `transactionalKeysOf` in `@roastery/beans/application/commands` — the
 *   same question asked of a whole spec at once.
 */
export function isTransactional(commandClass: unknown): boolean {
	return (
		typeof commandClass === "function" &&
		(commandClass as { transactional?: unknown }).transactional === true
	);
}
