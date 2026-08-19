import { BoundAggregateCommand } from "@/application/command/aggregate-command";
import type {
	AggregateCommandClassOf,
	CommandDefinition,
	CommandPropertiesShapeBase,
} from "@/application/command/types";
import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Builds an `AggregateCommand` base class already bound to a blueprint, so a
 * subclass declares only its `handle()`.
 *
 * `commandOf`'s counterpart, for the single-aggregate-result case: the
 * generated base already implements `defineCommand()` **and** `execute()`
 * (via `AggregateCommand`), so the subclass owes nothing but `handle()` —
 * no `defineCommand`, no `interface X extends CommandAccessorsOf<…> {}`
 * merge, no manual `collectResult` call.
 *
 * `Deps` and `Result` cannot be inferred from the blueprint — nothing in the
 * properties mentions them — so all three type arguments are given
 * explicitly, exactly as `commandOf` already requires. The class it returns
 * is **abstract**: `handle()` is still owed.
 *
 * **Call it once, at module scope**, for the same memoization reason as
 * every other class factory in the package.
 *
 * @typeParam Shape - The blueprint shape: one `ValueObject` class per field.
 * @typeParam Deps - The dependencies `handle()` takes.
 * @typeParam Result - The single aggregate `handle()` produces; also what
 *   `CommandResult.events` is drained from.
 *
 * @param properties - The blueprint. Value-objects only — never a nested
 *   `Entity` or `Command`.
 * @param source - Stable command-type name (e.g. `"create-user"`).
 * @param extra - The rest of the definition, if any — currently the
 *   `sensitive` key list.
 * @returns An abstract base class to extend, implementing `handle()`.
 *
 * @example
 * ```ts
 * const createUserProperties = { email: EmailVO, name: StringVO, password: PasswordVO };
 *
 * class CreateUser extends aggregateCommandOf<typeof createUserProperties, Deps, User>(
 *   createUserProperties,
 *   "create-user",
 * ) {
 *   protected async handle({ secrets, users }: Deps): Promise<User> {
 *     const passwordId = await secrets.create(this.password); // typed accessor
 *     const user = new User({ email: this.email, name: this.name, password: passwordId });
 *     await users.save(user);
 *     return user;
 *   }
 * }
 * ```
 *
 * @see `CommandClassOf` in `../types/aggregate-command-class-of.type` — the returned shape.
 */
export function aggregateCommandOf<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result extends {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	},
>(
	properties: Shape,
	source: string,
	extra?: Omit<CommandDefinition<Shape>, "properties" | "source">,
): AggregateCommandClassOf<Shape, Deps, Result> {
	// Stamped as a static rather than closed over, for the same reason
	// `commandOf` does it: `defineCommand` must stay pure and prototype-borne,
	// since `fromJSON` reads it off an `Object.create` probe.
	abstract class BlueprintAggregateCommand extends BoundAggregateCommand<
		Shape,
		Deps,
		Result
	> {
		public static readonly definition: CommandDefinition<Shape> = {
			...extra,
			properties,
			source,
		};
	}

	// The cast covers the accessors alone — installed on the prototype at
	// construction, so the class expression cannot describe them.
	return BlueprintAggregateCommand as unknown as AggregateCommandClassOf<
		Shape,
		Deps,
		Result
	>;
}
