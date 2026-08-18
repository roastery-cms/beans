import type { EventReactionErrorHandler } from "./event-reaction-error-handler.type";

/**
 * `eventedRegistry`'s optional third argument.
 *
 * @see `eventedRegistry` — the only consumer.
 */
export type EventedRegistryOptions = {
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
