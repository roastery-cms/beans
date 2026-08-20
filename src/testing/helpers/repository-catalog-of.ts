import type { PropertiesShapeBase } from "@/domain/entity/types";
import { capitalizeKey } from "./capitalize-key";
import { filterKeysOf } from "./filter-keys-of";

/**
 * Every method name a repository can carry for one blueprint — the runtime
 * enumeration of `RepositoryMethodsOf`.
 *
 * **This is the one place in the package where a rule exists twice**, once as
 * a type and once as a value, and it is unavoidable: a union type cannot be
 * enumerated at runtime, and `inMemoryRepositoryOf` has to actually define the
 * methods it declares. The two copies drifting apart would produce a dummy
 * whose runtime shape disagrees with the port type it claims to satisfy — so
 * `in-memory-repository-of.spec.ts` carries a dedicated guard asserting this
 * list equals the type's own union, and that guard is the reason the
 * duplication is acceptable rather than merely tolerated.
 *
 * The result is de-duplicated, because the type it mirrors is a *union* and
 * therefore de-duplicates on its own. It matters in exactly one case: a
 * blueprint declaring a key literally called `ids` generates `findManyByIds`,
 * which is also a fixed name. `RepositoryContractOf` resolves that collision in
 * favour of the batch loader, and `inMemoryRepositoryOf` installs the fixed
 * implementations first for the same reason — so the name appearing twice here
 * would only make this list disagree with the type for no behavioural reason.
 *
 * `id` is deliberately absent from the `findManyBy*` half, exactly as
 * `RepositoryCollectionFilterKeysOf` excludes it: "many by a unique key" is a
 * contradiction, and `findManyById` would sit one character from
 * `findManyByIds`.
 *
 * @param properties - The entity's blueprint, as read by `definitionOf`.
 * @returns Every method name available for that blueprint, reads then writes.
 *
 * @example
 * ```ts
 * repositoryCatalogOf({ name: StringVO });
 * // ["count", "findMany", "findManyByIds",
 * //  "findByName", "findById", "findByCreatedAt", "findByUpdatedAt",
 * //  "findManyByName", "findManyByCreatedAt", "findManyByUpdatedAt",
 * //  "create", "update", "delete"]
 * ```
 *
 * @see `RepositoryMethodsOf` in `@roastery/beans/domain/repository/types` — the type this mirrors.
 */
export function repositoryCatalogOf(
	properties: PropertiesShapeBase,
): readonly string[] {
	const filterKeys = filterKeysOf(properties);
	const collectionKeys = filterKeys.filter((key) => key !== "id");

	return [
		...new Set([
			"count",
			"findMany",
			"findManyByIds",
			...filterKeys.map((key) => `findBy${capitalizeKey(key)}`),
			...collectionKeys.map((key) => `findManyBy${capitalizeKey(key)}`),
			...collectionKeys.map((key) => `countBy${capitalizeKey(key)}`),
			...filterKeys.map((key) => `existsBy${capitalizeKey(key)}`),
			"create",
			"update",
			"delete",
		]),
	];
}
