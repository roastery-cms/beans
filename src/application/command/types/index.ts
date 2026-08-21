/**
 * @module @roastery/beans/application/command/types
 *
 * Public types of the command pillar. The supporting aliases the machinery
 * is built from live in sibling `*.type.ts` files and stay out of this
 * barrel — they are reachable through inference (and by direct path when
 * needed). `DepsOfClass`, `PayloadOfClass` and `ResultOfClass` are three of
 * those: they live here now (a command class's own introspection is this
 * pillar's vocabulary, and `command-registry` cannot own it without
 * importing `CommandResult` back from here — a cycle), but stay off the
 * barrel exactly as they stayed off the registry's own.
 *
 * Re-exports:
 * - {@link AggregateCommandClassOf} — the class `aggregateCommandOf` returns.
 * - {@link AnyCommandClass} — the widest `Command` class type.
 * - {@link CommandAccessorsOf} — the interface to merge for blueprint-derived accessors.
 * - {@link CommandClassOf} — the class `commandOf` returns.
 * - {@link CommandDefinition} — what `defineCommand()` returns.
 * - {@link CommandPropertiesShapeBase} — the base constraint of every command blueprint.
 * - {@link CommandRegistrySpecBase} — the base constraint of a registry spec, and of a `Siblings` map.
 * - {@link CommandResult} — what `execute()` resolves to: the result plus any raised events.
 * - {@link CommandRunner} — a bound, ready-to-run command: payload in, `CommandResult` out.
 * - {@link ICommand} — the behavioural contract of every command.
 * - {@link RawCommandContextOf} — the constructor payload of a subclass.
 * - {@link SerializedCommand} — what `toJSON()` returns / `fromJSON` accepts.
 * - {@link WithSiblingCommands} — `Deps` plus the auto-derived `commands` bag.
 */

export type { AggregateCommandClassOf } from "./aggregate-command-class-of.type";
export type { AnyCommandClass } from "./any-command-class.type";
export type { CommandAccessorsOf } from "./command-accessors-of.type";
export type { CommandClassOf } from "./command-class-of.type";
export type { CommandDefinition } from "./command-definition.type";
export type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
export type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
export type { CommandResult } from "./command-result.type";
export type { CommandRunner } from "./command-runner.type";
export type { ICommand } from "./icommand.interface";
export type { RawCommandContextOf } from "./raw-command-context-of.type";
export type { SerializedCommand } from "./serialized-command.type";
export type { WithSiblingCommands } from "./with-sibling-commands.type";
