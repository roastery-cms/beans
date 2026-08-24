import type { CommandsSpecBase } from "@/application/command/types";
import type { EventedCommandsOf } from "./evented-commands-of.type";

/**
 * What `commands(spec, options)` returns: the second half of the
 * two-phase declaration, exposing **only**
 * {@link EventedCommandsBuilder.withDependencies} — the same reasoning
 * `CommandsBuilder` already documents: a literal can't reference its
 * own `typeof`, so `Spec` is fixed by the first call before `Dependencies`
 * is checked against every registered handler's `Deps` in the second.
 *
 * @typeParam Spec - The command spec fixed by the first call.
 * @see `commands` in `@roastery/beans/application/commands` — returns this.
 * @see `CommandsBuilder` — what the overload without `options` returns.
 */
export type EventedCommandsBuilder<Spec extends CommandsSpecBase> = {
	/**
	 * Supplies the dependency record and returns the finished registry.
	 *
	 * @typeParam Dependencies - Inferred from the literal, `const` so its
	 *   members stay narrow enough for `RegistrableEventHandlerClass` to gate on.
	 * @param dependencies - The dependency record every registered command's
	 *   `execute()`, and every reaction's `handle()`, will be called with.
	 * @returns The registry — `.get(key)`/`.on(...)` plus one accessor per
	 *   registrable spec key, see {@link EventedCommandsOf}.
	 */
	withDependencies<const Dependencies>(
		dependencies: Dependencies,
	): EventedCommandsOf<Spec, Dependencies>;
};
