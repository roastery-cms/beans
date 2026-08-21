/**
 * @module @roastery/beans/application/evented-registry/types
 *
 * Public types of the evented-registry pillar. The supporting aliases the
 * machinery is built from (`EventClassOf`, `AnyEventHandlerClass`,
 * `EventHandlerDepsOfClass`, `EventHandlerEventOfClass`,
 * `RegistrableEventHandlerClass`) live in sibling `*.type.ts` files and stay
 * out of this barrel — reachable by direct path when needed, the same way
 * `command-registry` keeps its own supporting aliases out of its barrel.
 *
 * Re-exports:
 * - {@link EventedRegistryBuilder} — what `eventedRegistry(spec, emitter)` returns.
 * - {@link EventedRegistryOf} — what `withDependencies(deps)` returns, accessors included.
 * - {@link EventedRegistryOptions} — `eventedRegistry`'s optional third argument.
 * - {@link EventHandlerClassOf} — the class `defineEventHandler` returns.
 * - {@link EventReactionErrorContext} — what `onError` receives alongside the error.
 * - {@link EventReactionErrorHandler} — `EventedRegistryOptions.onError`'s shape.
 * - {@link IEventedRegistry} — the named-member half of {@link EventedRegistryOf}.
 * - {@link IEventEmitter} — the contract every raised event is published through.
 * - {@link IEventHandler} — the contract a reaction implements.
 */

export type { EventedRegistryBuilder } from "./evented-registry-builder.type";
export type { EventedRegistryOf } from "./evented-registry-of.type";
export type { EventedRegistryOptions } from "./evented-registry-options.type";
export type { EventHandlerClassOf } from "./event-handler-class-of.type";
export type { EventReactionErrorContext } from "./event-reaction-error-context.type";
export type { EventReactionErrorHandler } from "./event-reaction-error-handler.type";
export type { IEventedRegistry } from "./ievented-registry.interface";
export type { IEventEmitter } from "./ievent-emitter.interface";
export type { IEventHandler } from "./ievent-handler.interface";
