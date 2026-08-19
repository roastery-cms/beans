import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { ICanReadBy } from "./ican-read-by.type";

/**
 * The capability of looking one entity up by its identity: `findById(value)`.
 *
 * A **named alias**, not a contract of its own. `id` is already a filter key —
 * the `Entity` base stamps it on every aggregate, so `RepositoryFilterKeysOf`
 * includes it and `ICanReadBy<EntityClass, "id">` already generates exactly
 * `findById(value: string): Promise<Instance | null>`. Redeclaring the method
 * here would be a second source of truth for the most-used method in the
 * pillar, free to drift from the other twenty.
 *
 * It exists because `findById` is the capability a use case asks for most
 * often, and `ICanReadId<typeof User>` says that in the `Deps` slot better
 * than `ICanReadBy<typeof User, "id">` does.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadId<typeof User> };
 *
 * class RenameUser extends AggregateCommand<typeof properties, Deps, User> {
 *   protected async handle(deps: Deps): Promise<User> {
 *     const user = await deps.users.findById(this.userId);
 *     // …
 *   }
 * }
 * ```
 *
 * @see {@link ICanReadBy} — what this is an alias of.
 */
export type ICanReadId<EntityClass extends AnyEntityClass> = ICanReadBy<
	EntityClass,
	"id"
>;
