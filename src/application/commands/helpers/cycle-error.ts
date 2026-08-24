import { LoopDetectedException } from "@roastery/terroir/exceptions/application";

/**
 * Builds the exception a call chain throws (or, for an event node, reports
 * through `onError`) when it revisits a node — a command key or an event
 * name — already on its own chain.
 *
 * @remarks
 * The runtime guard behind {@link commands}' sibling-commands bag and its
 * `react` dispatch, in one function because one `chain` covers both: a
 * command reached through `deps.commands` that calls back into a key
 * already running, and a reaction whose triggered command raises the same
 * event again (directly or through further reactions), would each otherwise
 * recurse until the call stack gives out. The `command:` / `event:` prefix
 * on a node is what tells the two apart in the message, so the caller does
 * not have to say which kind of cycle it caught.
 *
 * @param chain - Every `command:<key>` / `event:<name>` node visited so
 *   far, in call order, ending with the node that closed the cycle.
 * @returns A `LoopDetectedException` (HTTP 508) naming the full chain.
 *
 * @example
 * ```ts
 * throw cycleError(["command:confirmOrder", "event:order.confirmed", "command:confirmOrder"]);
 * ```
 *
 * @see `commands` in `@/application/commands/commands` — its only caller.
 */
export function cycleError(chain: readonly string[]): LoopDetectedException {
	return new LoopDetectedException(
		"commands",
		`commands: the call chain cycled back to an already-active command or event (chain: ${chain.join(" → ")}). Composition has no runtime depth limit, but it must stay acyclic — break the cycle in how these commands and reactions call each other.`,
	);
}
