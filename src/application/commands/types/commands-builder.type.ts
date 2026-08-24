import type { CommandsSpecBase } from "@/application/command/types";
import type { CommandsOf } from "./commands-of.type";

/**
 * What `commands(spec)` returns: the second half of the two-phase
 * declaration, exposing **only** {@link CommandsBuilder.withDependencies}
 * — mirroring `BlueprintBuilder`'s own reasoning
 * (`domain/entity/types/blueprint-builder.type.ts`): a literal can't
 * reference its own `typeof`, so `Spec` is fixed by the first call before
 * `Dependencies` is checked against it in the second, and a forgotten
 * `.withDependencies(...)` is a type error rather than a half-built registry.
 *
 * @typeParam Spec - The command spec fixed by the first call.
 * @see `commands` in `@roastery/beans/application/commands` — returns this.
 * @see `EventedCommandsBuilder` — what the overload taking `options` returns.
 */
export type CommandsBuilder<Spec extends CommandsSpecBase> = {
	/**
	 * Supplies the dependency record and returns the finished registry.
	 *
	 * @typeParam Dependencies - Inferred from the literal, `const` so its
	 *   members stay narrow enough for {@link RegistrableKeys} to gate on.
	 * @param dependencies - The dependency record every registered command's
	 *   `execute()` will be called with.
	 * @returns The registry — `.get(key)` plus one accessor per registrable
	 *   spec key, see {@link CommandsOf}.
	 */
	withDependencies<const Dependencies>(
		dependencies: Dependencies,
	): CommandsOf<Spec, Dependencies>;
};
