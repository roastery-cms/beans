/**
 * @module @roastery/beans/application/commands/types
 *
 * Public types of the `commands` pillar. The supporting aliases the
 * machinery is built from (`AugmentedDependencies`, `EventClassOf`,
 * `AnyEventHandlerClass`, `EventHandlerDepsOfClass`,
 * `EventHandlerEventOfClass`, `RegistrableEventHandlerClass`,
 * `RegistrableKeys`, `SiblingCommands`) live in sibling `*.type.ts` files
 * and stay out of this barrel — they are reachable through inference, and by
 * direct path when needed.
 *
 * `AnyCommandClass`, `CommandsSpecBase` and `CommandRunner` are re-exported
 * from `application/command/types`, where they live so that a command's own
 * `Siblings` argument can name them without this pillar importing back into
 * one that already imports `CommandResult` from it.
 *
 * Re-exports:
 * - {@link AnyCommandClass} — the widest `Command` class type.
 * - {@link CommandRunner} — a bound, ready-to-run command: payload in, `CommandResult` out.
 * - {@link CommandRunnersOf} — the accessor half of a finished registry.
 * - {@link CommandsBuilder} — what `commands(spec)` returns.
 * - {@link CommandsOf} — what `withDependencies(deps)` returns, accessors included.
 * - {@link CommandsOptions} — `commands`' second argument, events-free form.
 * - {@link CommandsSpecBase} — the base constraint of every `commands` spec.
 * - {@link EventedCommandsBuilder} — what `commands(spec, options)` returns.
 * - {@link EventedCommandsOf} — what its `withDependencies(deps)` returns, `.on()` included.
 * - {@link EventedCommandsOptions} — `commands`' optional second argument.
 * - {@link EventHandlerClassOf} — the class `defineEventHandler` returns.
 * - {@link EventReactionErrorContext} — what `onError` receives alongside the error.
 * - {@link EventReactionErrorHandler} — `EventedCommandsOptions.onError`'s shape.
 * - {@link ICommands} — the named-member half of {@link CommandsOf}.
 * - {@link IEventedCommands} — the named-member half of {@link EventedCommandsOf}.
 * - {@link IEventEmitter} — the contract every raised event is published through.
 * - {@link IEventHandler} — the contract a reaction implements.
 * - {@link TransactionBoundary} — the `transaction` option's shape.
 */

export type {
	AnyCommandClass,
	CommandRunner,
	CommandsSpecBase,
} from "@/application/command/types";
export type { CommandRunnersOf } from "./command-runners-of.type";
export type { CommandsBuilder } from "./commands-builder.type";
export type { CommandsOf } from "./commands-of.type";
export type { CommandsOptions } from "./commands-options.type";
export type { EventedCommandsBuilder } from "./evented-commands-builder.type";
export type { EventedCommandsOf } from "./evented-commands-of.type";
export type { EventedCommandsOptions } from "./evented-commands-options.type";
export type { EventHandlerClassOf } from "./event-handler-class-of.type";
export type { EventReactionErrorContext } from "./event-reaction-error-context.type";
export type { EventReactionErrorHandler } from "./event-reaction-error-handler.type";
export type { ICommands } from "./icommands.interface";
export type { IEventedCommands } from "./ievented-commands.interface";
export type { IEventEmitter } from "./ievent-emitter.interface";
export type { IEventHandler } from "./ievent-handler.interface";
export type { TransactionBoundary } from "./transaction-boundary.type";
