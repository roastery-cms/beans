/**
 * @module @roastery/beans/application/command
 *
 * Public entry point for the command pillar.
 *
 * Re-exports:
 * - {@link Command} — abstract, blueprint-driven base class every
 *   application-layer command extends.
 * - {@link AggregateCommand} — `Command` specialized for the common case its
 *   result is a single aggregate: `execute()` comes already implemented,
 *   and the subclass implements `handle()` instead, returning the aggregate
 *   on its own rather than the `CommandResult` envelope.
 *
 * Types (`CommandDefinition`, `CommandResult`, `CommandAccessorsOf`, …) live
 * one level deeper at `@roastery/beans/application/command/types`, and the
 * public helpers (`collectDomainEvents`, `collectResult`, `commandOf`,
 * `aggregateCommandOf`, `defineUseCase`) at
 * `@roastery/beans/application/command/helpers` — mirroring how the entity
 * pillar keeps its own types and helpers behind dedicated subpaths.
 */

export { AggregateCommand } from "./aggregate-command";
export { Command } from "./command";
