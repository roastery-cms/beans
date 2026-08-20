import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * The minimal, structural contract `eventedRegistry` publishes every raised
 * domain event through, before running any in-process reaction. `beans`
 * implements no event bus of its own — this is the whole surface an
 * adapter needs to satisfy, implemented outside the package (wrapping a
 * message broker client, a logger, or the host runtime's own event
 * primitive).
 *
 * Deliberately **not** shaped like Node's own `EventEmitter`
 * (`emit(name, ...args): boolean`, synchronous, never `await`ing an async
 * listener) — `eventedRegistry`'s own reactions are never dispatched
 * through this interface. They are registered and run through `.on()`
 * instead, against `eventedRegistry`'s own internal registry, precisely
 * because no `IEventEmitter` implementation can be trusted to `await` a
 * listener the way the reactor's `await`-before-resolving guarantee
 * requires. `emit` therefore only ever needs to describe "publish one
 * event, optionally asynchronously" — nothing about subscribing.
 *
 * @example
 * ```ts
 * // Adapting a bus is one method, with no subscription logic needed.
 * class KafkaEmitter implements IEventEmitter {
 *   public constructor(private readonly producer: Producer) {}
 *   public async emit(event: IDomainEvent): Promise<void> {
 *     await this.producer.send({ topic: event.name, messages: [{ value: JSON.stringify(event) }] });
 *   }
 * }
 * ```
 *
 * @see `eventedRegistry` in `@roastery/beans/application/evented-registry` — the only caller of `emit`.
 * @see `NodeEventEmitterAdapter` in `@roastery/beans/node` — the ready-made
 *   adapter for Node's own `EventEmitter`, so that one never has to be written.
 */
export interface IEventEmitter {
	/**
	 * Publishes one domain event. Called once per event, in the order the
	 * events appear in a `CommandResult.events` array, before that event's
	 * own reactions (if any) run.
	 *
	 * @param event - The event to publish.
	 * @returns Nothing, or a `Promise` `eventedRegistry` `await`s before
	 *   moving on — for an emitter backed by real I/O.
	 */
	emit(event: IDomainEvent): void | Promise<void>;
}
