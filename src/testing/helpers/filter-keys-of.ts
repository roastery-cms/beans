import { Entity } from "@/domain/entity";
import type { PropertiesShapeBase } from "@/domain/entity/types";

/**
 * The blueprint keys a generated repository may filter by, read at runtime:
 * the value-object-backed domain keys plus the three identity fields the
 * `Entity` base stamps on.
 *
 * The runtime counterpart of `RepositoryFilterKeysOf`, and it has to select
 * exactly the same set. Two details carry that agreement:
 *
 * - **Nested entities are excluded**, discriminated with
 *   `prototype instanceof Entity` — the same runtime check the `Entity` base
 *   itself uses to tell a nested aggregate from a value-object, rather than a
 *   structural guess. Importing the class here is safe: nothing in `src/`
 *   imports `testing/`, so there is no cycle to create.
 * - **`Object.keys` skips symbols**, so a ruled blueprint's `[Rules]` slot
 *   never appears — the same property the type side gets from going through
 *   `DomainKeys` instead of bare `keyof`.
 *
 * @param properties - The entity's blueprint, as read by `definitionOf`.
 * @returns The filterable keys, domain keys first, then `id`/`createdAt`/`updatedAt`.
 *
 * @example
 * ```ts
 * filterKeysOf({ name: StringVO, email: EmailVO, profile: Profile });
 * // ["name", "email", "id", "createdAt", "updatedAt"] — never "profile"
 * ```
 *
 * @see `RepositoryFilterKeysOf` in `@roastery/beans/domain/repository/types` — the type this mirrors.
 */
export function filterKeysOf(
	properties: PropertiesShapeBase,
): readonly string[] {
	const domainKeys = Object.keys(properties).filter(
		(key) => !(properties[key]?.prototype instanceof Entity),
	);

	return [...domainKeys, "id", "createdAt", "updatedAt"];
}
