import type { AugmentedDependencies } from "./augmented-dependencies.type";
import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { DepsOfClass } from "./deps-of-class.type";

/**
 * The spec keys `.get()` may accept: every key whose command declares
 * `Deps = void` (registrable unconditionally), plus every key whose declared
 * `Deps` is structurally satisfied by {@link AugmentedDependencies} — the raw
 * `Dependencies` record **plus** the `commands` bag of siblings reachable in
 * one hop. This is what lets `UpdateUser` (needing `commands.login`) become
 * registrable once `login` itself is directly registrable, without either
 * command needing to say anything about the other beyond `UpdateUser`'s own
 * `Deps` naming `commands: { login: CommandRunner<typeof Login> } }`.
 *
 * Two branches exist for the "no deps needed" case for the same reason
 * {@link DirectlyRegistrableKeys} needs them: {@link DepsOfClass} resolves to
 * `unknown` when a subclass elides `execute`'s parameter (the idiomatic style
 * throughout this package) and to `void` only when it's named explicitly —
 * both mean "reads nothing from `execute`'s argument" and both must be
 * registrable regardless of what `Dependencies` is.
 *
 * **This is a compile-time-only gate, and it proves at most one hop of
 * composition.** Nothing here runs at runtime — a caller who bypasses
 * TypeScript (an `as never` cast, a plain-JS consumer) can still call
 * `.get()` for a key whose dependencies were never actually supplied.
 * Conversely, the **runtime** `commands` bag is built once, unfiltered, and
 * shared by every command at every depth (see `command-registry.ts`), so a
 * chain deeper than one hop still *works* if it is ever actually reached —
 * this type is simply unable to *prove* that chain safe in advance, so
 * `.get()` conservatively withholds it. It's also **structural, not exact**:
 * a `Dependencies` record whose nested method-shaped members are merely
 * bivariantly compatible (TypeScript's own, deliberate carve-out for method
 * shorthand under `strictFunctionTypes`) can satisfy this even when it isn't
 * truly a safe substitute — the same limitation `Command`'s own `execute`
 * already lives with, not something new this type introduces.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `ICommandRegistry.get` — the only consumer.
 * @see `DirectlyRegistrableKeys` — the narrower, one-hop-earlier gate this builds on.
 */
export type RegistrableKeys<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = {
	[Key in Extract<keyof Spec, string>]: unknown extends DepsOfClass<Spec[Key]>
		? Key
		: DepsOfClass<Spec[Key]> extends void
			? Key
			: AugmentedDependencies<Spec, Dependencies> extends DepsOfClass<Spec[Key]>
				? Key
				: never;
}[Extract<keyof Spec, string>];
