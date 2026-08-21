import type { CommandRegistrySpecBase } from "@/application/command/types";
import type { SiblingCommands } from "./sibling-commands.type";

/**
 * What every registered command's `execute()` actually receives at a given
 * depth: the raw `Dependencies` record, plus — when `WithCommands` is `true`
 * — the `commands` bag of siblings. A command that never mentions `commands`
 * in its own `Deps` is unaffected: an object with an extra property is still
 * assignable wherever the narrower shape was expected.
 *
 * `WithCommands` is the whole depth mechanism, and it is what collapsed the
 * former `DirectlyRegistrableKeys`/`RegistrableKeys` pair into one type. The
 * `false` instantiation is precisely "what the raw record alone satisfies",
 * which is the base case {@link SiblingCommands} needs in order to decide
 * which siblings are safe to hand out — and the recursion terminates there,
 * since `AugmentedDependencies<Spec, Dependencies, false>` is `Dependencies`
 * and reaches for nothing further.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @typeParam WithCommands - Whether the `commands` bag is part of what is on
 *   offer. **Always instantiate with a literal `true`/`false`, never a bare
 *   `boolean`**: `boolean` is `true | false`, and a conditional over a naked
 *   type parameter distributes across a union, collapsing both branches into
 *   one — the depth cap would silently stop capping.
 * @see `RegistrableKeys` — the gate this feeds, at both depths.
 */
export type AugmentedDependencies<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
	WithCommands extends boolean = true,
> = WithCommands extends true
	? Dependencies & {
			readonly commands: SiblingCommands<Spec, Dependencies>;
		}
	: Dependencies;
