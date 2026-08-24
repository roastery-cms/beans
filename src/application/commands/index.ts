/**
 * @module @roastery/beans/application/commands
 *
 * Public entry point for the `commands` pillar.
 *
 * Re-exports:
 * - {@link commands} — two-phase builder gating access to a set of `Command`
 *   subclasses by their declared dependencies, at compile time; give it an
 *   `emitter` and the same registry also publishes every raised domain event
 *   and runs the `await`ed, isolated reactions registered via
 *   `.on(eventClass, handlerClass)`.
 * - {@link defineEventHandler} — builds an `IEventHandler` class from just
 *   its `handle` function, the same `(args) => class` idiom
 *   `defineDomainEvent`/`defineValueObject` already use.
 * - {@link transactionalKeysOf} — the spec keys marked `transactional`, so a
 *   caller who wants a registry missing its `transaction` option to be loud
 *   can fail at bootstrap. Mirrors `uniqueKeysOf` one layer down: `commands`
 *   itself never fails on the combination.
 *
 * Types (`ICommands`, `IEventedCommands`, `IEventHandler`, `IEventEmitter`,
 * …) live one level deeper at `@roastery/beans/application/commands/types` —
 * mirroring how the command pillar keeps its own types behind a dedicated
 * subpath.
 */

export { commands } from "./commands";
export { defineEventHandler } from "./define-event-handler";
export { transactionalKeysOf } from "./helpers/transactional-keys-of";
