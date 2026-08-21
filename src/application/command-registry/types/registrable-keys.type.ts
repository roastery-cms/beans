import type { CommandRegistrySpecBase } from "@/application/command/types";
import type { DepsOfClass } from "@/application/command/types/deps-of-class.type";
import type { AugmentedDependencies } from "./augmented-dependencies.type";

/**
 * The spec keys `.get()` may accept at a given depth: every key whose command
 * declares `Deps = void` (registrable unconditionally), plus every key whose
 * declared `Deps` is structurally satisfied by {@link AugmentedDependencies}
 * at that depth.
 *
 * At the default depth (`WithCommands = true`) that means the raw
 * `Dependencies` record **plus** the `commands` bag of siblings reachable in
 * one hop — which is what lets `UpdateUser` (needing `commands.login`) become
 * registrable once `login` itself is directly registrable, without either
 * command saying anything about the other beyond `UpdateUser`'s own `Deps`.
 * At `false` it means the raw record alone, which is the base case
 * {@link SiblingCommands} builds its own key set from: a `commands` entry that
 * itself secretly needed another sibling would be a promise `.get()` cannot
 * keep at that key.
 *
 * Those two depths used to be two types — this one and a near-identical
 * `DirectlyRegistrableKeys` — differing only in what they checked against.
 * They are one type with a flag now, because that difference *is* a depth.
 *
 * Two branches exist for the "no deps needed" case at either depth:
 * {@link DepsOfClass} resolves to `unknown` when a subclass elides `execute`'s
 * parameter (the idiomatic style throughout this package) and to `void` only
 * when it is named explicitly, matching the abstract signature verbatim —
 * both mean "reads nothing from `execute`'s argument" and both must be
 * registrable regardless of what `Dependencies` is. A naive `Dependencies
 * extends DepsOfClass<...>` alone would wrongly exclude the explicit-`void`
 * style whenever `Dependencies` is not itself `void`.
 *
 * **This is a compile-time-only gate, and it proves at most one hop of
 * composition.** Nothing here runs at runtime — a caller who bypasses
 * TypeScript (an `as never` cast, a plain-JS consumer) can still call `.get()`
 * for a key whose dependencies were never actually supplied. Conversely, the
 * **runtime** `commands` bag has no depth limit at all (see
 * `command-registry.ts`), so a chain deeper than one hop still *works* if it
 * is ever reached — this type is simply unable to *prove* that chain safe in
 * advance, so `.get()` conservatively withholds it. It is also **structural,
 * not exact**: a `Dependencies` record whose nested method-shaped members are
 * merely bivariantly compatible (TypeScript's own, deliberate carve-out for
 * method shorthand under `strictFunctionTypes`) can satisfy this even when it
 * is not truly a safe substitute — the same limitation `Command`'s own
 * `execute` already lives with, not something new this type introduces.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @typeParam WithCommands - Whether sibling commands count toward what is on
 *   offer. **Always instantiate with a literal `true`/`false`, never a bare
 *   `boolean`** — see {@link AugmentedDependencies} for why a union here
 *   would defeat the cap.
 * @see `ICommandRegistry.get` — the `true`-depth consumer.
 * @see `SiblingCommands` — the `false`-depth consumer.
 */
export type RegistrableKeys<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
	WithCommands extends boolean = true,
> = {
	[Key in Extract<keyof Spec, string>]: unknown extends DepsOfClass<Spec[Key]>
		? Key
		: DepsOfClass<Spec[Key]> extends void
			? Key
			: AugmentedDependencies<
						Spec,
						Dependencies,
						WithCommands
					> extends DepsOfClass<Spec[Key]>
				? Key
				: never;
}[Extract<keyof Spec, string>];
