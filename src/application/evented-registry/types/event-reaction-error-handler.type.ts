import type { EventReactionErrorContext } from "./event-reaction-error-context.type";

/**
 * `EventedRegistryOptions.onError`'s shape: how a reaction's failure becomes
 * visible without breaking the isolation guarantee every other reaction (and
 * the `CommandResult` that raised the event) already has.
 *
 * If this itself throws, `eventedRegistry` falls back to its unconditional
 * default (re-throwing inside a microtask, see `defaultOnError`) for that
 * one failure — there is nowhere further to escalate to without giving up
 * isolation.
 *
 * @param error - Whatever the reaction threw or rejected with — `unknown`,
 *   the same way a `catch` binding is.
 * @param context - `{ event }` — see `EventReactionErrorContext`.
 * @see `EventedRegistryOptions.onError` — the only place this type is used.
 */
export type EventReactionErrorHandler = (
	error: unknown,
	context: EventReactionErrorContext,
) => void | Promise<void>;
