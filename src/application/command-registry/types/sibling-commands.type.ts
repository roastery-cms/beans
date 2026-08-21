import type {
	CommandRegistrySpecBase,
	CommandRunner,
} from "@/application/command/types";
import type { RegistrableKeys } from "./registrable-keys.type";

/**
 * The `commands` bag every registered command's `execute()` additionally
 * receives — one bound {@link CommandRunner} per sibling in `Spec`, letting a
 * command reuse another already-registered use case instead of duplicating
 * its logic (e.g. `UpdateUser` calling `commands.login` rather than
 * re-implementing credential verification).
 *
 * **Restricted to `RegistrableKeys<Spec, Dependencies, false>`** — siblings
 * satisfiable from the raw `Dependencies` record alone, never through another
 * sibling's own `commands` access. This is deliberately **one hop only**:
 * including a sibling that itself needs `commands` would let a command's
 * declared `Deps` claim access to something `.get()` cannot actually prove is
 * safe, since TypeScript has no general fixpoint here — the check would have
 * to assume its own conclusion. A command whose `Deps` names a sibling that
 * is only transitively reachable is not provably safe and is excluded, even
 * though the **runtime** composition has no such limit (see
 * `command-registry.ts`: the bag is rebuilt per call at any depth, guarded
 * only against cycles) — only what `.get()` can *prove* at compile time is
 * capped.
 *
 * The `false` is what makes that cap a single knob rather than a second,
 * near-duplicate type: `AugmentedDependencies<Spec, Dependencies, false>` is
 * `Dependencies` itself, so the recursion through `RegistrableKeys` bottoms
 * out one level down instead of reaching back here.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `AugmentedDependencies` — where this is merged in under the `commands` key.
 * @see `WithSiblingCommands` in `@/application/command/types` — the
 *   declaration-site counterpart, given its siblings instead of computing them.
 */
export type SiblingCommands<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = {
	[Key in RegistrableKeys<Spec, Dependencies, false>]: CommandRunner<Spec[Key]>;
};
