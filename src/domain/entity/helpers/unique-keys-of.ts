import type { AnyEntityClass } from "../types/any-entity-class.type";
import { definitionOf } from "./read-definition";
import { resolveUniqueKeys } from "./resolve-unique-keys";

/**
 * Per-class memo. Keyed by the **class**, not the blueprint: two entities may
 * share one blueprint object and still name different extra keys in their own
 * `defineEntity`, so a blueprint-keyed cache would hand the second one the
 * first one's answer.
 */
const cache = new WeakMap<object, readonly string[]>();

/**
 * Every key an entity class declares as unique — `id`, the blueprint keys whose
 * value-object says `unique: true`, and the extra keys its `defineEntity`
 * named.
 *
 * This is the entry point a **persistence adapter** reaches for: it takes the
 * class, so it works at composition time, before any instance exists — when a
 * repository is deciding which columns need a unique index, or which `WHERE`
 * to run before an insert. Inside `create(entity)`/`update(entity)`, where the
 * port hands over an instance, `entity.isUnique(key)` answers the same question
 * without a second lookup.
 *
 * Reads the definition through the same construction-free `Object.create` probe
 * `Entity.fromJSON`, `entityHas` and `inMemoryRepositoryOf` already use, so
 * nothing is constructed and `defineEntity`'s purity contract is enough.
 *
 * **It reports the declaration, never the stored data.** Whether a *value* is
 * already taken is a question about the set of rows, which only the adapter can
 * answer; `beans` ships one implementation of that check, in
 * `inMemoryRepositoryOf`.
 *
 * @param entityClass - The concrete `Entity` subclass, e.g. `User`.
 * @returns The unique keys, `id` first and then blueprint order. Never empty.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineEntity` was written
 *   as a class field instead of a prototype method, so the probe cannot read it.
 *
 * @example
 * ```ts
 * import { uniqueKeysOf } from "@roastery/beans/domain/entity/helpers";
 *
 * class User extends entityOf(userProperties, "user", { unique: ["handle"] }) {}
 *
 * uniqueKeysOf(User); // ["id", "email", "handle"] — `email` from EmailVO's meta
 * ```
 *
 * @see `Entity.isUnique` — the same declaration, asked one key at a time.
 */
export function uniqueKeysOf(entityClass: AnyEntityClass): readonly string[] {
	const cached = cache.get(entityClass);

	if (cached) return cached;

	const { properties, unique } = definitionOf(entityClass);
	const keys = [...resolveUniqueKeys(properties, unique)];

	cache.set(entityClass, keys);

	return keys;
}
