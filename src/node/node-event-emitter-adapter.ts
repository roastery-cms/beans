import { EventEmitter } from "node:events";
import type { IEventEmitter } from "@/application/evented-registry/types";
import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Adapts Node's own `EventEmitter` to the `IEventEmitter` contract
 * `eventedRegistry` publishes through — the whole translation being "forward
 * the event as the sole listener argument, keyed by its `name`".
 *
 * `beans` implements no event bus, so every `eventedRegistry` call site has to
 * supply one; this is the boilerplate that was being retyped in every test and
 * every small app that just wants the host runtime's own primitive. Node's
 * `emit(name, ...args): boolean` is a genuinely different shape — synchronous,
 * positional, never `await`ing a listener — which is why the translation has
 * to exist at all rather than `EventEmitter` satisfying `IEventEmitter`
 * structurally.
 *
 * **It lives under `node/` to keep `node:events` out of the two layers**, and
 * that subpath is the whole point: this is production code. `domain` and `application` stay
 * runtime-agnostic — nothing in them imports a Node builtin — and an app whose
 * host *is* Node can use this in production perfectly well. What it does not
 * do is subscribe: `eventedRegistry` never dispatches its own reactions
 * through `IEventEmitter` (it `await`s them through its own registry instead),
 * so an adapter only ever needs `emit`.
 *
 * The inner emitter is **public**, and defaults to a fresh one. That is the
 * subscribe side: a test asserts on what was published by listening to
 * `adapter.inner` directly.
 *
 * @example
 * ```ts
 * import { NodeEventEmitterAdapter } from "@roastery/beans/testing";
 *
 * const emitter = new NodeEventEmitterAdapter();
 * const published: string[] = [];
 *
 * emitter.inner.on("order.confirmed", (event) => published.push(event.aggregateId));
 *
 * const registry = eventedRegistry(spec, emitter).withDependencies(deps);
 * await registry.get("confirmOrder")({ total: 100 });
 *
 * published; // ["01a0…"]
 * ```
 *
 * @example
 * ```ts
 * // Wrapping a bus the caller already owns
 * const bus = new EventEmitter();
 * const emitter = new NodeEventEmitterAdapter(bus);
 * ```
 *
 * @see `IEventEmitter` in `@roastery/beans/application/evented-registry/types` — the contract this satisfies.
 * @see `eventedRegistry` in `@roastery/beans/application/evented-registry` — the only caller of `emit`.
 */
export class NodeEventEmitterAdapter implements IEventEmitter {
	/**
	 * @param inner - The bus to publish through. Defaults to a fresh
	 *   `EventEmitter`; public so a caller can subscribe to it.
	 */
	public constructor(
		public readonly inner: EventEmitter = new EventEmitter(),
	) {}

	/**
	 * Publishes one domain event on the channel named after it, with the event
	 * itself as the only listener argument.
	 *
	 * **`"error"` is special-cased, and has to be.** It is Node's one reserved
	 * channel: emitting it with no listener registered throws
	 * `ERR_UNHANDLED_ERROR` instead of doing nothing. Since `eventedRegistry`
	 * `await`s this call inside the loop that publishes a command's events,
	 * that throw would reject the `CommandResult` of a command that actually
	 * succeeded — a domain event named `error` would break the very operation
	 * that raised it. Skipping the call when nothing is listening makes
	 * `"error"` behave exactly like every other name: with zero listeners an
	 * `emit` is already a no-op, so nothing is dropped that would otherwise
	 * have been delivered.
	 *
	 * @param event - The event to publish.
	 */
	public emit(event: IDomainEvent): void {
		if (event.name === "error" && this.inner.listenerCount("error") === 0)
			return;

		this.inner.emit(event.name, event);
	}
}
