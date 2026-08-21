/**
 * @module @roastery/beans/application/command-registry/types
 *
 * Public types of the command-registry pillar. The supporting aliases the
 * machinery is built from (`DepsOfClass`, `ResultOfClass`, `PayloadOfClass`,
 * `RegistrableKeys`) stay out of this barrel — reachable by direct path when
 * needed.
 *
 * `AnyCommandClass`, `CommandRegistrySpecBase` and `CommandRunner` are
 * **re-exported from `application/command/types`**, where they now live: all
 * three describe a *command class*, which is that pillar's vocabulary, and a
 * command's own `Siblings` declaration needs them long before any registry
 * exists. Keeping them here would have forced `application/command` to import
 * from `application/command-registry`, which already imports `CommandResult`
 * back from there. This subpath keeps serving the same names it always did.
 *
 * Re-exports:
 * - {@link AnyCommandClass} — the widest `Command` class type a spec value must satisfy.
 * - {@link CommandRegistryBuilder} — what `commandRegistry(spec)` returns.
 * - {@link CommandRegistryOf} — what `withDependencies(deps)` returns, accessors included.
 * - {@link CommandRegistrySpecBase} — the base constraint of every registry spec.
 * - {@link CommandRunner} — what `.get(key)` resolves to.
 * - {@link CommandRunnersOf} — the per-key accessor half of {@link CommandRegistryOf}.
 * - {@link ICommandRegistry} — the named-member half of {@link CommandRegistryOf}.
 */

export type {
	AnyCommandClass,
	CommandRegistrySpecBase,
	CommandRunner,
} from "@/application/command/types";
export type { CommandRegistryBuilder } from "./command-registry-builder.type";
export type { CommandRegistryOf } from "./command-registry-of.type";
export type { CommandRunnersOf } from "./command-runners-of.type";
export type { ICommandRegistry } from "./icommand-registry.interface";
