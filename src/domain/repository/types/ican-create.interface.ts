import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";

/**
 * The capability of persisting a new entity: `create(entity)`.
 *
 * **Takes the instance, not its serialized form.** Crossing from the domain
 * object to whatever the storage engine wants is the adapter's job — it is the
 * only side that knows the format — and `toJSON`/`fromJSON` are the tools it
 * reaches for. Putting `SerializedEntity` in the port would move that decision
 * to every call site instead.
 *
 * **Resolves to `void`.** Handing back a different instance would silently
 * discard the domain events buffered on the one the caller still holds, and
 * would compete with the `updatedAt` stamp the entity maintains itself. The
 * caller already has the entity; there is nothing for the port to give back.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanCreate<typeof User> };
 *
 * const user = new User({ name: "alan", email: "alan@roastery.dev" });
 * await deps.users.create(user);
 * ```
 *
 * **Uniqueness is enforced here, because only here it can be.** A blueprint
 * key may be declared unique — by its value-object's `unique: true` or by the
 * entity's own `defineEntity` — and `id` always is. An implementation reads
 * that declaration with `uniqueKeysOf(EntityClass)` at composition time, or
 * with `entity.isUnique(key)` on the instance it was handed, and rejects a
 * duplicate instead of writing it. `inMemoryRepositoryOf` is the one
 * implementation this package ships, and it honours all of it.
 *
 * @throws `ConflictException` (`@roastery/terroir/exceptions/infra`) — when the
 *   entity's `id` is already stored, or when a unique key's value is already
 *   held by another row. Nullish values never conflict, per SQL's rule that
 *   `NULL` is not equal to `NULL`.
 *
 * @see {@link ICanUpdate} — the same shape, for an entity that already exists.
 * @see `uniqueKeysOf` in `@roastery/beans/domain/entity/helpers` — the keys to check.
 */
export interface ICanCreate<EntityClass extends AnyEntityClass> {
	create(entity: EntityInstanceOf<EntityClass>): Promise<void>;
}
