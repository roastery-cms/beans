import type {
	CommandRegistrySpecBase,
	CommandRunner,
} from "@/application/command/types";
import type { RegistrableKeys } from "./registrable-keys.type";

/**
 * The per-key accessors a finished registry carries alongside `.get()`: one
 * ready-to-run bound function per spec key, reachable as
 * `registry.createUser(payload)` instead of `registry.get("createUser")(payload)`.
 *
 * @remarks
 * Keyed by {@link RegistrableKeys} at the **same depth `.get()` uses**
 * (`WithCommands = true`), so the direct form is gated exactly as the explicit
 * one is — a key whose declared `Deps` this registry's `Dependencies` doesn't
 * structurally satisfy is simply absent here, and reaching for it is a compile
 * error rather than a runtime surprise. Not a second gating rule: this type
 * states no condition of its own, it only maps over the union
 * {@link RegistrableKeys} already resolves.
 *
 * The **runtime** installs one property per `Object.keys(spec)` entry, since
 * registrability has no runtime footprint to read (see `registrable-keys.type.ts`
 * — the gate has always been compile-time-only). A caller who bypasses
 * TypeScript therefore still reaches a withheld key, exactly as they already
 * could through `.get(key as never)`.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `CommandRegistryOf` — the intersection this half belongs to.
 * @see `ICommandRegistry.get` — the explicit form, kept for dynamic or
 *   non-identifier keys.
 */
export type CommandRunnersOf<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = {
	readonly [Key in RegistrableKeys<Spec, Dependencies>]: CommandRunner<
		Spec[Key]
	>;
};
