import { BoundCommand } from "@/application/command/command";
import type {
	CommandClassOf,
	CommandDefinition,
	CommandPropertiesShapeBase,
} from "@/application/command/types";

/**
 * Builds a `Command` base class already bound to a blueprint, so a subclass
 * declares only its `execute()`.
 *
 * `entityOf`'s counterpart, replacing the same boilerplate: `defineCommand()`,
 * the `interface X extends CommandAccessorsOf<…> {}` merge, and the
 * `biome-ignore` that merge requires. The accessors come out typed without it.
 *
 * `Deps` and `Result` cannot be inferred from the blueprint — nothing in the
 * properties mentions them — so all three type arguments are given explicitly,
 * exactly as they already are when extending `Command<…>` directly. The class
 * it returns is **abstract**: `execute()` is still owed.
 *
 * **Call it once, at module scope**, for the same memoization reason as every
 * other class factory in the package.
 *
 * @typeParam Shape - The blueprint shape: one `ValueObject` class per field.
 * @typeParam Deps - The dependencies `execute()` takes.
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @param properties - The blueprint. Value-objects only — never a nested
 *   `Entity` or `Command`.
 * @param source - Stable command-type name (e.g. `"create-user"`).
 * @param extra - The rest of the definition, if any — currently the
 *   `sensitive` key list.
 * @returns An abstract base class to extend, implementing `execute()`.
 *
 * @example
 * ```ts
 * const createUserProperties = { email: EmailVO, name: StringVO, password: PasswordVO };
 *
 * class CreateUser extends commandOf<typeof createUserProperties, Deps, User>(
 *   createUserProperties,
 *   "create-user",
 * ) {
 *   public async execute({ secrets, users }: Deps): Promise<CommandResult<User>> {
 *     const passwordId = await secrets.create(this.password); // typed accessor
 *     const user = new User({ email: this.email, name: this.name, password: passwordId });
 *     await users.save(user);
 *     return { result: user, events: collectDomainEvents(user) };
 *   }
 * }
 * ```
 *
 * @see `CommandClassOf` in `../types/command-class-of.type` — the returned shape.
 */
export function commandOf<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result,
>(
	properties: Shape,
	source: string,
	extra?: Omit<CommandDefinition<Shape>, "properties" | "source">,
): CommandClassOf<Shape, Deps, Result> {
	// Stamped as a static rather than closed over, for the same reason
	// `entityOf` does it: `defineCommand` must stay pure and prototype-borne,
	// since `fromJSON` reads it off an `Object.create` probe.
	abstract class BlueprintCommand extends BoundCommand<Shape, Deps, Result> {
		public static readonly definition: CommandDefinition<Shape> = {
			...extra,
			properties,
			source,
		};
	}

	// The cast covers the accessors alone — installed on the prototype at
	// construction, so the class expression cannot describe them.
	return BlueprintCommand as unknown as CommandClassOf<Shape, Deps, Result>;
}
