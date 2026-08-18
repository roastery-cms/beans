import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * What `onError` receives alongside the error itself: the event whose
 * reaction threw — enough to log which event triggered the failure, or to
 * decide whether a compensating action is warranted.
 *
 * @see `EventReactionErrorHandler` — where this becomes the second parameter.
 */
export type EventReactionErrorContext = {
	/** The event a reaction was running for when it threw. */
	readonly event: IDomainEvent;
};
