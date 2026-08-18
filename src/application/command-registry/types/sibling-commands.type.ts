import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { CommandRunner } from "./command-runner.type";
import type { DirectlyRegistrableKeys } from "./directly-registrable-keys.type";

/**
 * The `commands` bag every registered command's `execute()` additionally
 * receives — one bound {@link CommandRunner} per sibling in `Spec`, letting a
 * command reuse another already-registered use case instead of duplicating
 * its logic (e.g. `UpdateUser` calling `commands.login` rather than
 * re-implementing credential verification).
 *
 * **Restricted to {@link DirectlyRegistrableKeys}** — siblings satisfiable
 * from the raw `Dependencies` record alone, never through another sibling's
 * own `commands` access. This is deliberately **one hop only**: including a
 * sibling that itself needs `commands` would let a command's declared `Deps`
 * claim access to something `.get()` cannot actually prove is safe, since
 * TypeScript has no general fixpoint here — the check would have to assume
 * its own conclusion. A command whose `Deps` names a sibling that is only
 * transitively reachable (needs `commands` itself) is not provably safe and
 * is excluded, even though the **runtime** composition has no such limit (see
 * `command-registry.ts`: the `commands` bag is built once, unfiltered, and
 * shared by every invocation at any depth) — only what `.get()` can *prove*
 * at compile time is capped at one hop.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `AugmentedDependencies` — where this is merged in under the `commands` key.
 */
export type SiblingCommands<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = {
	[Key in DirectlyRegistrableKeys<Spec, Dependencies>]: CommandRunner<
		Spec[Key]
	>;
};
