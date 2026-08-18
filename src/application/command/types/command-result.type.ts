import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * What `Command.execute()` resolves to: the domain result plus every domain
 * event raised by the aggregates it touched along the way.
 *
 * `events` is always an array — empty when nothing was raised, never
 * `undefined` — matching what `Entity.pullDomainEvents()` itself returns.
 * `Command` never publishes these on its own: `execute()` only surfaces
 * them (typically via `collectDomainEvents`), leaving the decision of
 * when/how to publish to whoever called `execute()`.
 *
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @see `collectDomainEvents` in `@roastery/beans/application/command/helpers`
 *   — drains one or more aggregates' buffers into this shape's `events`.
 */
export type CommandResult<Result> = {
	readonly result: Result;
	readonly events: readonly IDomainEvent[];
};
