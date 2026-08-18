/**
 * @module @roastery/beans/application/command
 *
 * Public entry point for the command pillar.
 *
 * Re-exports:
 * - {@link Command} — abstract, blueprint-driven base class every
 *   application-layer command extends.
 *
 * Types (`CommandDefinition`, `CommandResult`, `CommandAccessorsOf`, …) live
 * one level deeper at `@roastery/beans/application/command/types`, and the
 * one public helper (`collectDomainEvents`) at
 * `@roastery/beans/application/command/helpers` — mirroring how the entity
 * pillar keeps its own types and helpers behind dedicated subpaths.
 */

export { Command } from "./command";
