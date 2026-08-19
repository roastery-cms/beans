/**
 * @module @roastery/beans/testing
 *
 * The batteries a test needs: doubles generated from the same blueprints the
 * rest of the package derives everything else from, plus the adapters that
 * would otherwise be retyped at every call site.
 *
 * **Not a layer.** `domain` and `application` are still the only two —
 * `testing` is a time-of-use concern, the way `way` is a ceremony concern and
 * `shared` an internals one. It sits behind its own subpath so a production
 * bundle never reaches it by accident, and it is deliberately absent from
 * `@roastery/beans/way`, which curates the low-ceremony subset of *production*
 * entry points.
 *
 * It is also the first place in `beans` with runtime outside the two layers,
 * and the only place that imports a Node builtin — which is the second reason
 * it exists. The `repository` pillar it doubles stays type-only and emits zero
 * bytes, and `domain`/`application` stay runtime-agnostic; the implementations
 * live here.
 *
 * Re-exports:
 * - {@link inMemoryRepositoryOf} — an in-memory repository for one entity,
 *   generated from its blueprint and typed as the `RepositoryOf` port a real
 *   adapter would implement.
 * - {@link NodeEventEmitterAdapter} — Node's `EventEmitter`, wrapped to
 *   satisfy the `IEventEmitter` contract `eventedRegistry` publishes through.
 */

export { inMemoryRepositoryOf } from "./in-memory-repository-of";
export { NodeEventEmitterAdapter } from "./node-event-emitter-adapter";
