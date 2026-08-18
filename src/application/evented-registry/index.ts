/**
 * @module @roastery/beans/application/evented-registry
 *
 * Public entry point for the evented-registry pillar.
 *
 * Re-exports:
 * - {@link defineEventHandler} — builds an `IEventHandler` class from just
 *   its `handle` function, the same `(args) => class` idiom
 *   `defineDomainEvent`/`defineValueObject` already use.
 * - {@link eventedRegistry} — declares `commandRegistry`, gaining event
 *   behaviour: auto-publishing every raised domain event through an
 *   `IEventEmitter`, and running `await`ed, isolated reactions registered
 *   via `.on(eventClass, handlerClass)`.
 *
 * Types (`IEventedRegistry`, `IEventHandler`, `IEventEmitter`, …) live one
 * level deeper at `@roastery/beans/application/evented-registry/types` —
 * mirroring how `command-registry` keeps its own types behind a dedicated
 * subpath.
 */

export { defineEventHandler } from "./define-event-handler";
export { eventedRegistry } from "./evented-registry";
