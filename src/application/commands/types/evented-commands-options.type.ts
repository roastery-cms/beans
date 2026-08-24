import type { CommandsOptions } from "./commands-options.type";
import type { EventReactionErrorHandler } from "./event-reaction-error-handler.type";
import type { IEventEmitter } from "./ievent-emitter.interface";

/**
 * `commands`' second argument in its **evented** form — supplying an
 * `emitter` is what turns a plain registry into one that publishes and
 * reacts.
 *
 * @remarks
 * `emitter` is **required inside this object** on purpose. It is what
 * separates `commands`' two overloads: with no emitter the registry has no
 * `.on()` at all, and asking for `onError` without one — reaction isolation
 * for reactions that could never be registered — is a compile error rather
 * than a silently events-free registry. A caller whose emitter only
 * sometimes exists branches at the call site:
 * `emitter ? commands(spec, { emitter }) : commands(spec)`.
 *
 * Everything on {@link CommandsOptions} is available here too — the two
 * concerns are orthogonal, so a registry can have a transaction boundary with
 * or without a bus, and vice versa. It arrives through `Partial<…>` because
 * `transaction` is *required* on that type and optional on this one: there,
 * it is the only key and an options object with nothing in it would be a
 * pointless call; here, `emitter` already justifies the argument.
 *
 * @example
 * ```ts
 * commands(spec, {
 *   emitter: new NodeEventEmitterAdapter(),
 *   transaction: (work) => runner.run(work),
 *   onError: (error, { event }) => logger.error(`reaction to ${event.name} failed`, error),
 * });
 * ```
 *
 * @see `CommandsOptions` — the same options minus `emitter`/`onError`.
 * @see `commands` — the only consumer.
 */
export type EventedCommandsOptions = Partial<CommandsOptions> & {
	/**
	 * Where every event a registered command's `CommandResult` carries is
	 * published, before that event's reactions run. The whole contract is one
	 * `emit` method — subscription is not part of it, since reactions are
	 * resolved by `.on()` inside the registry, never through the bus.
	 *
	 * Publication happens **after** a transactional command committed, never
	 * inside its boundary — see `transaction`.
	 */
	readonly emitter: IEventEmitter;

	/**
	 * Called when a reaction throws or rejects, isolated from every sibling
	 * reaction and from the `CommandResult` of the command that raised the
	 * event. Omit it and a failure still never breaks anything — it surfaces
	 * instead as an unhandled exception inside a microtask (see
	 * `defaultOnError`), visible through whatever the host runtime already
	 * does with those.
	 */
	readonly onError?: EventReactionErrorHandler;
};
