import type { CommandResult } from "@/application/command/types";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { collectDomainEvents } from "./collect-domain-events";

/**
 * Builds a whole `CommandResult<Result>` from the aggregate `execute()` is
 * returning as its `result` — collapsing the two-line pattern every
 * `Command.execute()` otherwise repeats
 * (`{ result: entity, events: collectDomainEvents(entity) }`) into one call.
 * `result` is both the value returned as `CommandResult.result` and the
 * primary aggregate drained (deep) for `CommandResult.events`.
 *
 * Typed structurally — `Result extends { pullDomainEvents(...) }` — the same
 * way {@link collectDomainEvents} is, rather than against the concrete
 * `Entity` class. A concrete `Entity<Shape>` is not structurally assignable
 * to a nominal `Entity<PropertiesShapeBase>` bound (its `toJSON()`/`get()`
 * return types are shape-dependent), the same incompatibility
 * `EntityConstructor` already sidesteps for the lifecycle decorators' mixin
 * base — a structural bound accepts any real entity subclass without
 * hitting it.
 *
 * @param result - The aggregate to surface as `CommandResult.result`; also
 *   drained (deep) for `CommandResult.events`.
 * @param rest - Any other aggregates touched during `execute()` — not
 *   themselves the result — whose events should still be collected, in call
 *   order after `result`'s own.
 * @returns `{ result, events }`, ready to return from `execute()`.
 *
 * @example
 * ```ts
 * public async execute({ users }: Deps): Promise<CommandResult<User>> {
 *   const user = await users.findById(this.userId);
 *   user.deactivate();
 *   await users.save(user);
 *   return collectResult(user);
 * }
 * ```
 */
export function collectResult<
	Result extends {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	},
>(
	result: Result,
	...rest: readonly {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	}[]
): CommandResult<Result> {
	return { result, events: collectDomainEvents(result, ...rest) };
}
