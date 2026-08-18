/**
 * @module @roastery/beans/application/command/types
 *
 * Public types of the command pillar. The supporting aliases the machinery
 * is built from live in sibling `*.type.ts` files and stay out of this
 * barrel — they are reachable through inference (and by direct path when
 * needed).
 *
 * Re-exports:
 * - {@link CommandAccessorsOf} — the interface to merge for blueprint-derived accessors.
 * - {@link CommandClassOf} — the class `commandOf` returns.
 * - {@link CommandDefinition} — what `defineCommand()` returns.
 * - {@link CommandPropertiesShapeBase} — the base constraint of every command blueprint.
 * - {@link CommandResult} — what `execute()` resolves to: the result plus any raised events.
 * - {@link ICommand} — the behavioural contract of every command.
 * - {@link RawCommandContextOf} — the constructor payload of a subclass.
 * - {@link SerializedCommand} — what `toJSON()` returns / `fromJSON` accepts.
 */

export type { CommandAccessorsOf } from "./command-accessors-of.type";
export type { CommandClassOf } from "./command-class-of.type";
export type { CommandDefinition } from "./command-definition.type";
export type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
export type { CommandResult } from "./command-result.type";
export type { ICommand } from "./icommand.interface";
export type { RawCommandContextOf } from "./raw-command-context-of.type";
export type { SerializedCommand } from "./serialized-command.type";
