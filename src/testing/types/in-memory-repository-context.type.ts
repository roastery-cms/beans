import type { SerializedEntity } from "@/domain/entity/types";
import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type {
	RepositoryMethodsOf,
	RepositoryOf,
} from "@/domain/repository/types";
import type { EntityInstanceOf } from "@/domain/repository/types/entity-instance-of.type";

/**
 * What `inMemoryRepositoryOf`'s handler receives: every method that was
 * generated, plus the raw store behind them.
 *
 * **`context` is a snapshot, taken before the handler's own methods are merged
 * in.** That is what makes an override a decorator rather than a dead end: a
 * handler returning its own `findById` can still call `context.findById` and
 * reach the generated one underneath — the usual way a test makes the third
 * call fail, or counts invocations, without reimplementing the lookup.
 *
 * `rows` and `hydrate` are the escape hatch the generated methods cannot
 * cover. A custom query — "every archived row", "the two most recent" — has no
 * blueprint-derived method to compose from, and routing it through paginated
 * `findMany` calls would be absurd for an in-memory double. They are the raw
 * serialized rows and the `fromJSON` that turns one back into an entity, which
 * together are exactly what the generated methods themselves are built on.
 *
 * Mutating `rows` directly is supported and expected — that is how a `seed`
 * helper skips the entity round-trip.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Names - The method names that were generated.
 *
 * @example
 * ```ts
 * inMemoryRepositoryOf(User, [], (context) => ({
 *   seed: (...users: User[]) => {
 *     for (const user of users) context.rows.set(user.id, user.toJSON());
 *   },
 *   clear: () => context.rows.clear(),
 *   async findFirstArchived() {
 *     const row = [...context.rows.values()].find((each) => each.archivedAt !== null);
 *     return row ? context.hydrate(row) : null;
 *   },
 * }));
 * ```
 *
 * @see {@link InMemoryRepositoryHandler} — the function this is passed to.
 */
export type InMemoryRepositoryContext<
	EntityClass extends AnyEntityClass,
	Names extends RepositoryMethodsOf<EntityClass>,
> = RepositoryOf<EntityClass, Names> & {
	/** The raw serialized rows, keyed by entity id. Safe to read and mutate. */
	readonly rows: Map<string, SerializedEntity<PropertiesOfClass<EntityClass>>>;

	/** Turns one stored row back into an entity, through the same `fromJSON` every read uses. */
	readonly hydrate: (
		row: SerializedEntity<PropertiesOfClass<EntityClass>>,
	) => EntityInstanceOf<EntityClass>;
};
