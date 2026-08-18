import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { SiblingCommands } from "./sibling-commands.type";

/**
 * What every registered command's `execute()` actually receives: the raw
 * `Dependencies` record, plus the `commands` bag of one-hop-reachable
 * siblings. A command that never mentions `commands` in its own `Deps` is
 * unaffected — an object with an extra property is still assignable
 * wherever the narrower shape was expected, so nothing about an existing
 * command's registrability changes by this addition.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `RegistrableKeys` — checks a command's `Deps` against this, not against `Dependencies` alone.
 */
export type AugmentedDependencies<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = Dependencies & {
	readonly commands: SiblingCommands<Spec, Dependencies>;
};
