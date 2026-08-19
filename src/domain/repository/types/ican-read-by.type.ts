import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { EntityInstanceOf } from "./entity-instance-of.type";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";
import type { RepositoryFilterValueOf } from "./repository-filter-value-of.type";

/**
 * The capability of looking one entity up by one blueprint key:
 * `findBy{Key}(value)`, resolving to the entity or `null`.
 *
 * `Key` may be a union, in which case the contract carries one method per
 * member — `ICanReadBy<typeof User, "id" | "email">` is
 * `{ findById(value: string): …; findByEmail(value: string): … }`.
 *
 * **Contract:** a miss resolves to `null`, it never throws. "Not found" is an
 * ordinary answer to a lookup; whether it is an *error* is the caller's
 * judgement, and a `Command` that needs it to be one throws its own exception
 * with its own status.
 *
 * A `findBy*` is a single-result lookup even when the key is not unique — the
 * adapter decides which match wins, typically the first. When a key genuinely
 * identifies more than one row, reach for {@link ICanReadManyBy} instead.
 *
 * The key remapping is written over `Key` itself (`[Each in Key as …]`) rather
 * than over the generated names (`[Name in \`findBy${Capitalize<Key>}\`]`).
 * With `Key` a union the second form loses the pairing: every generated method
 * would take the union of *every* key's value type, so `findByEmail` would
 * also accept whatever `findByName` accepts.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Key - The blueprint key (or union of keys) to look up by.
 *
 * @example
 * ```ts
 * type Deps = { users: ICanReadBy<typeof User, "email"> };
 *
 * // await deps.users.findByEmail("alan@roastery.dev") → User | null
 * ```
 *
 * @see {@link ICanReadId} — the `"id"` case, named.
 * @see {@link RepositoryOf} — the generator that assembles these.
 */
export type ICanReadBy<
	EntityClass extends AnyEntityClass,
	Key extends RepositoryFilterKeysOf<PropertiesOfClass<EntityClass>>,
> = {
	readonly [Each in Key as `findBy${Capitalize<Each>}`]: (
		value: RepositoryFilterValueOf<PropertiesOfClass<EntityClass>, Each>,
	) => Promise<EntityInstanceOf<EntityClass> | null>;
};
