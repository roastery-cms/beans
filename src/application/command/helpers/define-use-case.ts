import type {
	AggregateCommandClassOf,
	CommandDefinition,
	CommandPropertiesShapeBase,
	CommandRegistrySpecBase,
	WithSiblingCommands,
} from "@/application/command/types";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { aggregateCommandOf } from "./aggregate-command-of";

/**
 * Builds the base class for a use case: given some input, do something, get
 * a result back. A thin, friendlier-named entry point onto
 * {@link aggregateCommandOf} — same class, same behaviour, nothing new —
 * for the common case where that something touches exactly one aggregate.
 *
 * ```ts
 * class CreateUser extends defineUseCase<typeof createUserProperties, Deps, User>(
 *   createUserProperties,
 *   "create-user",
 * ) {
 *   protected async handle({ users }: Deps): Promise<User> {
 *     const user = new User({ name: this.name, email: this.email });
 *     await users.save(user);
 *     return user;
 *   }
 * }
 * ```
 *
 * Reach for {@link aggregateCommandOf}/`AggregateCommand`/`Command` directly
 * by name once a use case stops fitting this shape — its result isn't a
 * single aggregate, or the behaviour touches more than one.
 *
 * @typeParam Shape - The blueprint shape: one `ValueObject` class per field.
 * @typeParam Deps - The dependencies `handle()` takes.
 * @typeParam Result - The single aggregate `handle()` produces.
 * @typeParam Siblings - Sibling use cases this one reaches through
 *   `deps.commands`, given as a map of registry key to command **class**
 *   (`{ login: typeof LoginCommand }`). The `commands` bag both registries
 *   already inject at runtime is derived from it and merged into `Deps`, so
 *   nothing has to be spelled out in `CommandRunner<...>` terms by hand.
 *   Empty by default, which leaves `Deps` exactly as given.
 *
 * @param properties - The blueprint. Value-objects only.
 * @param source - Stable name for this use case (e.g. `"create-user"`).
 * @param extra - The rest of the definition, if any — currently the
 *   `sensitive` key list.
 * @returns An abstract base class to extend, implementing `handle()`.
 *
 * @see `aggregateCommandOf` in `./aggregate-command-of` — what this delegates to.
 */
export function defineUseCase<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result extends {
		pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[];
	},
	Siblings extends CommandRegistrySpecBase = Record<never, never>,
>(
	properties: Shape,
	source: string,
	extra?: Omit<CommandDefinition<Shape>, "properties" | "source">,
): AggregateCommandClassOf<Shape, WithSiblingCommands<Deps, Siblings>, Result> {
	return aggregateCommandOf<Shape, Deps, Result, Siblings>(
		properties,
		source,
		extra,
	);
}
