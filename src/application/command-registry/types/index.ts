/**
 * @module @roastery/beans/application/command-registry/types
 *
 * Public types of the command-registry pillar. The supporting aliases the
 * machinery is built from (`DepsOfClass`, `ResultOfClass`, `PayloadOfClass`,
 * `RegistrableKeys`) live in sibling `*.type.ts` files and stay out of this
 * barrel — reachable by direct path when needed.
 *
 * Re-exports:
 * - {@link AnyCommandClass} — the widest `Command` class type a spec value must satisfy.
 * - {@link CommandRegistryBuilder} — what `commandRegistry(spec)` returns.
 * - {@link CommandRegistrySpecBase} — the base constraint of every registry spec.
 * - {@link CommandRunner} — what `.get(key)` resolves to.
 * - {@link ICommandRegistry} — what `withDependencies(deps)` returns.
 */

export type { AnyCommandClass } from "./any-command-class.type";
export type { CommandRegistryBuilder } from "./command-registry-builder.type";
export type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
export type { CommandRunner } from "./command-runner.type";
export type { ICommandRegistry } from "./icommand-registry.interface";
