import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Drains one or more aggregates' domain-event buffers and concatenates them
 * in call order — the glue between `Entity.raiseEvent` (which only the
 * aggregate itself may call) and `Command.execute()`'s `CommandResult`
 * (which surfaces them to whoever called `execute()`).
 *
 * Typed structurally against "anything with a `pullDomainEvents()`" rather
 * than against the concrete `Entity` class, matching the rest of the
 * package's preference for structural discrimination over `instanceof`.
 *
 * Pulls **deep**: each aggregate is drained together with the entities
 * nested in its blueprint. `Entity.pullDomainEvents` defaults to draining
 * only the root's own buffer, which is the right default for a direct call —
 * but this helper exists precisely so a `CommandResult` does not silently
 * lose events, and a nested entity carrying lifecycle decorators raises on
 * its own construction. A shallow pull here would strand exactly those. The
 * parameter is optional in the structural type, so a hand-rolled aggregate
 * whose `pullDomainEvents()` takes no argument still satisfies it and simply
 * ignores the option.
 *
 * @param aggregates - The entities touched during `execute()`, in the order
 *   their events should appear.
 * @returns Every event raised by every aggregate and its nested entities,
 *   oldest first within each, aggregates concatenated in the order given.
 *
 * @example
 * ```ts
 * public async execute({ users }: Deps): Promise<CommandResult<User>> {
 *   const user = await users.findById(this.userId);
 *   user.deactivate();
 *   await users.save(user);
 *   return { result: user, events: collectDomainEvents(user) };
 * }
 * ```
 */
export function collectDomainEvents(
	...aggregates: readonly {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	}[]
): readonly IDomainEvent[] {
	return aggregates.flatMap((aggregate) =>
		aggregate.pullDomainEvents({ deep: true }),
	);
}
