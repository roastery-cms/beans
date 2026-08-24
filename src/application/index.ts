/**
 * @module @roastery/beans/application
 *
 * Public entry point for the application layer: the `command` and
 * `commands` pillars.
 *
 * Re-exports:
 * - {@link Command} — abstract, blueprint-driven base class every
 *   application-layer command extends; its original home is
 *   `@roastery/beans/application/command`.
 * - {@link AggregateCommand} — `Command` specialized for a single-aggregate
 *   result: `execute()` is already implemented, the subclass writes
 *   `handle()` instead; same original home.
 * - {@link commands} — two-phase builder gating access to a set of
 *   `Command` subclasses by their declared dependencies, at compile time,
 *   publishing their events and running reactions when given an `emitter`;
 *   its original home is `@roastery/beans/application/commands`.
 * - {@link defineEventHandler} — builds a reaction class from just its
 *   `handle` function; same original home.
 *
 * `@roastery/beans/application/collections/*` mirrors the domain layer's own
 * `collections` catalog (schemas and value-objects), so a `Command`
 * blueprint never has to reach across into `@roastery/beans/domain` just to
 * reuse a `ValueObject`.
 */

export { AggregateCommand, Command } from "./command";
export { commands, defineEventHandler } from "./commands";
