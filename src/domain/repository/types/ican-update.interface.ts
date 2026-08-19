import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";

/**
 * The capability of persisting changes to an existing entity:
 * `update(entity)`.
 *
 * Takes the instance and resolves to `void`, for the same reasons
 * {@link ICanCreate} does.
 *
 * Split from `create` rather than collapsed into one `save`: they are
 * different authorities. A use case that may only edit what already exists
 * asks for `ICanUpdate` alone, and the type system then makes creating a row
 * impossible for it — a distinction a single `save` erases.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadId<typeof User> & ICanUpdate<typeof User> };
 *
 * const user = await deps.users.findById(id);
 * user?.rename("alan reis");
 * if (user) await deps.users.update(user);
 * ```
 *
 * Honours the same unique keys {@link ICanCreate} does, with one difference
 * that falls out of the operation rather than needing a rule of its own: the
 * row being written is excluded from the scan, so re-saving an entity whose
 * unique value did not change passes, while borrowing a sibling row's value
 * does not.
 *
 * @throws `ResourceNotFoundException` (`@roastery/terroir/exceptions/infra`) —
 *   when no row carries the entity's `id`. An update that would affect zero
 *   rows is a failure, not a silent insert.
 * @throws `ConflictException` (`@roastery/terroir/exceptions/infra`) — when a
 *   unique key's new value is already held by another row.
 *
 * @see {@link ICanCreate} — the insert half.
 */
export interface ICanUpdate<EntityClass extends AnyEntityClass> {
	update(entity: EntityInstanceOf<EntityClass>): Promise<void>;
}
