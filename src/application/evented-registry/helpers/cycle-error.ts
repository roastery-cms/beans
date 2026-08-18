import { LoopDetectedException } from "@roastery/terroir/exceptions/application";

/**
 * Builds the exception a reaction chain throws (or, for an event node,
 * reports through `onError`) when it revisits a node — a command key or an
 * event name — already on its own call chain.
 *
 * @remarks
 * The runtime guard behind {@link eventedRegistry}'s own sibling-commands
 * bag and its `react` dispatch: a reaction whose triggered command raises
 * the same event again (directly or through further reactions) would
 * otherwise recurse until the call stack gives out.
 *
 * @param chain - Every `command:<key>` / `event:<name>` node visited so
 *   far, in call order, ending with the node that closed the cycle.
 * @returns A `LoopDetectedException` (HTTP 508) naming the full chain.
 */
export function reactionCycleError(
	chain: readonly string[],
): LoopDetectedException {
	return new LoopDetectedException(
		"evented-registry",
		`eventedRegistry: a reaction chain cycled back to an already-active command or event (chain: ${chain.join(" → ")}). A reaction's own triggered command reached a command or raised an event already on this chain — break the cycle in how these commands and reactions call each other.`,
	);
}
