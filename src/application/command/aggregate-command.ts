import type { IDomainEvent } from "@/domain/domain-event/types";
import { Command } from "./command";
import { collectResult } from "./helpers/collect-result";
import { readBoundDefinition } from "./helpers/read-bound-definition";
import type { CommandDefinition } from "./types/command-definition.type";
import type { CommandPropertiesShapeBase } from "./types/command-properties-shape-base.type";
import type { CommandResult } from "./types/command-result.type";

/**
 * `Command` variant for the common case its own docs already name but leave
 * manual: the result is a single aggregate, and `execute()`'s last line is
 * always `return collectResult(result)`. Here that line is not written by
 * the subclass at all — `execute()` is no longer abstract, it is inherited,
 * and the subclass implements `handle()` instead, returning `Result` on its
 * own rather than the `CommandResult<Result>` envelope.
 *
 * `handle` is `protected`, the same visibility `Entity.raiseEvent` uses and
 * for the same reason: `execute()` stays the one public verb a caller (or
 * `commandRegistry`) ever calls, and how it builds its `CommandResult` is an
 * implementation detail, not part of the contract.
 *
 * `Result` carries the exact structural bound {@link collectResult} already
 * declares — duplicated here inline, the same way `collectDomainEvents` and
 * `collectResult` already duplicate it between themselves, rather than
 * introducing a shared named type for a bound that appears in one more
 * place. That bound is also this class's deliberate limitation: it only
 * fits a `handle()` that touches **one** aggregate, the one it returns. A
 * command whose `execute()` needs `collectResult(result, ...rest)` — extra
 * aggregates beyond the result — or whose result isn't an aggregate at all
 * (a `string`, `null`, …) still extends `Command` directly and builds its
 * own `CommandResult`.
 *
 * One inference nuance, harmless but worth stating: because `execute`'s
 * parameter is always named here (it has to forward to `handle(deps)`), a
 * `Deps = void` command built on `AggregateCommand` resolves through
 * `DepsOfClass` as `void` rather than the `unknown` a hand-written
 * `execute()` without a parameter would infer. `RegistrableKeys` and
 * `DirectlyRegistrableKeys` already treat both outcomes identically — that
 * double branch exists precisely for this — so registration through
 * `commandRegistry`/`eventedRegistry` is unaffected either way.
 *
 * @typeParam Shape - The command's blueprint shape: one `ValueObject` class
 *   per input field.
 * @typeParam Deps - The dependencies `handle()` takes (repositories,
 *   external services, …).
 * @typeParam Result - The single aggregate `handle()` produces; also what
 *   {@link CommandResult.events} is drained from.
 *
 * @see `Command` — the base this specializes; reach for it directly outside
 *   the single-aggregate-result case above.
 * @see `collectResult` in `@roastery/beans/application/command/helpers` —
 *   what `execute()` now calls on the subclass's behalf.
 * @see `command-registry`'s `DepsOfClass` — the `void`/`unknown` nuance
 *   noted above.
 *
 * @example
 * ```ts
 * class CreateUserCommand extends AggregateCommand<typeof createUserProperties, Deps, User> {
 *   protected defineCommand(): CommandDefinition<typeof createUserProperties> {
 *     return { properties: createUserProperties, source: "create-user" };
 *   }
 *
 *   protected async handle({ secrets, users }: Deps): Promise<User> {
 *     const passwordId = await secrets.hash(this.password);
 *     const user = new User({ email: this.email, name: this.name, password: passwordId });
 *     await users.save(user);
 *     return user;
 *   }
 * }
 *
 * const { result: user, events } = await new CreateUserCommand({ ... }).execute({ secrets, users });
 * ```
 */
export abstract class AggregateCommand<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result extends {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	},
> extends Command<Shape, Deps, Result> {
	/**
	 * Runs the command's behaviour and returns the resulting aggregate on its
	 * own — `execute()` handles wrapping it into a `CommandResult`.
	 *
	 * @param deps - The dependencies the behaviour needs.
	 * @returns The aggregate to surface as `CommandResult.result`, and to
	 *   drain (deep) for `CommandResult.events`.
	 */
	protected abstract handle(deps: Deps): Promise<Result>;

	/**
	 * Inherited so no subclass has to write it: calls {@link
	 * AggregateCommand.handle} and hands the aggregate it returns straight to
	 * {@link collectResult}.
	 *
	 * @param deps - Forwarded to `handle` unchanged.
	 * @returns `handle`'s result plus the domain events drained from it.
	 */
	public async execute(deps: Deps): Promise<CommandResult<Result>> {
		return collectResult(await this.handle(deps));
	}
}

/**
 * `BoundCommand`'s counterpart: an `AggregateCommand` subclass that reads
 * its definition from a static on the class it is constructed as, so
 * `aggregateCommandOf` has a base whose `defineCommand` is already
 * implemented.
 *
 * Still **abstract** — a `handle()` is still owed, and that one genuinely
 * must be implemented by the subclass. The point is only to take
 * `defineCommand` off the list, the same TS2515 dodge `BoundCommand` exists
 * for.
 *
 * Not exported from any barrel — `aggregateCommandOf` is the only way to
 * produce one.
 *
 * @typeParam Shape - The blueprint shape.
 * @typeParam Deps - The dependencies `handle()` takes.
 * @typeParam Result - The single aggregate `handle()` produces.
 *
 * @see `aggregateCommandOf` in `./helpers/aggregate-command-of` — the only producer.
 */
export abstract class BoundAggregateCommand<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result extends {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	},
> extends AggregateCommand<Shape, Deps, Result> {
	/**
	 * Reads the definition the factory stamped onto the generated class.
	 *
	 * @returns The blueprint and command-type name bound at factory call time.
	 *
	 * @throws `InvalidEntityDefinitionException` — when the class was produced
	 *   some other way and carries no definition.
	 */
	protected defineCommand(): CommandDefinition<Shape> {
		return readBoundDefinition<Shape>(this, "aggregateCommandOf");
	}
}
