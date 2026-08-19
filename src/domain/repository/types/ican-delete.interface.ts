import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";

/**
 * The capability of removing an entity: `delete(entity)`.
 *
 * Takes the **instance**, not the id. Deleting is a domain operation on an
 * aggregate the use case has already loaded and, usually, already called
 * `destroy()` on — passing the entity keeps whatever events that raised
 * reachable to the caller, and keeps the port from becoming a way to delete a
 * row the use case never proved exists.
 *
 * Resolves to `void`, like the other two writes.
 *
 * Whether the removal is a hard delete or a soft one is the adapter's call and
 * deliberately not in the contract: a soft-delete aggregate declares
 * `deletedAt: NullableDateTimeVO` in its blueprint, which makes the difference
 * visible in the model rather than hidden in a port's semantics.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadId<typeof User> & ICanDelete<typeof User> };
 *
 * const user = await deps.users.findById(id);
 * if (user) {
 *   user.destroy();
 *   await deps.users.delete(user);
 * }
 * ```
 *
 * @throws `ResourceNotFoundException` (`@roastery/terroir/exceptions/infra`) —
 *   when no row carries the entity's `id`. A delete affecting zero rows is
 *   reported rather than swallowed: the caller believed it held a persisted
 *   aggregate, and it did not.
 *
 * @see {@link ICanCreate} — the insert half.
 */
export interface ICanDelete<EntityClass extends AnyEntityClass> {
	delete(entity: EntityInstanceOf<EntityClass>): Promise<void>;
}
