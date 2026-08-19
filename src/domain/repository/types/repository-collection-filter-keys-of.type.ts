import type { PropertiesShapeBase } from "@/domain/entity/types";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";

/**
 * {@link RepositoryFilterKeysOf} minus `id` — the keys a **collection** read
 * may filter by.
 *
 * `findManyById` is excluded for two reasons at once. Semantically it is a
 * contradiction: `id` is unique, so "many by id" can only ever return zero or
 * one row, which is exactly what `findById` already is. Practically it would
 * also read one character away from `findManyByIds`, the batch loader — two
 * methods with near-identical names and entirely different contracts is a
 * call-site mistake waiting to happen.
 *
 * `createdAt` and `updatedAt` stay in: filtering a collection by timestamp is
 * an ordinary query.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link ICanReadManyBy} — the contract this constrains.
 * @see {@link ICanReadManyByIds} — the batch loader `findManyById` would collide with.
 */
export type RepositoryCollectionFilterKeysOf<
	PropertiesShape extends PropertiesShapeBase,
> = Exclude<RepositoryFilterKeysOf<PropertiesShape>, "id">;
