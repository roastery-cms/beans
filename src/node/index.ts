/**
 * @module @roastery/beans/node
 *
 * The Node-specific implementations: everything in `beans` that needs a Node
 * builtin to do its job, and nothing else.
 *
 * **Not a layer.** `domain` and `application` are still the only two — this is
 * a *host* concern, the way `testing` is a time-of-use one and `way` a
 * ceremony one. Its whole reason to exist is negative: by keeping every
 * `node:*` import behind one subpath, the two layers stay runtime-agnostic and
 * remain usable from a worker, an edge function or a browser without dragging
 * a Node shim along.
 *
 * This used to live under `@roastery/beans/testing`, which had the isolation
 * right and the address wrong. The adapter below is production code — an app
 * whose host is Node can publish through it — and a subpath named `testing`
 * said the opposite to every reader who never got as far as the TSDoc.
 *
 * Re-exports:
 * - {@link NodeEventEmitterAdapter} — Node's `EventEmitter`, wrapped to
 *   satisfy the `IEventEmitter` contract `commands` publishes through.
 */

export { NodeEventEmitterAdapter } from "./node-event-emitter-adapter";
