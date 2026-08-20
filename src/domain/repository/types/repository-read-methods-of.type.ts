import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";

/**
 * Every read method name available for one entity — the catalog
 * {@link RepositoryOf}'s spec is checked against.
 *
 * Three of them are fixed (`count`, `findMany`, `findManyByIds`); the rest are
 * **derived from the blueprint** — one `findBy*` and one `existsBy*` per filter
 * key, one `findManyBy*` and one `countBy*` per collection filter key. The two
 * halves differ over `id` alone: `existsById` is the primary-key check every
 * insert makes, while `countById` would only ever answer 0 or 1, the same
 * reason `findManyById` is absent. `findByEmail` is in the catalog
 * because the entity declares `email`, and it disappears the moment that key
 * is renamed — which is the entire point of the pillar.
 *
 * Hover this type on a concrete entity and TypeScript expands the whole union.
 * That matters: it is the discoverability fallback for the grouped spec form,
 * which the compiler cannot offer completions inside (see
 * {@link RepositoryGroupedSpecOf}).
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * const userProperties = { name: StringVO, email: EmailVO };
 *
 * type Reads = RepositoryReadMethodsOf<typeof User>;
 * // "count" | "findMany" | "findManyByIds"
 * //   | "findById" | "findByCreatedAt" | "findByUpdatedAt"
 * //   | "findByName" | "findByEmail"
 * //   | "findManyByCreatedAt" | "findManyByUpdatedAt"
 * //   | "findManyByName" | "findManyByEmail"
 * //   | "countByCreatedAt" | "countByUpdatedAt"
 * //   | "countByName" | "countByEmail"
 * //   | "existsById" | "existsByCreatedAt" | "existsByUpdatedAt"
 * //   | "existsByName" | "existsByEmail"
 * ```
 *
 * @see {@link RepositoryWriteMethods} — the write-side counterpart.
 * @see {@link RepositoryMethodsOf} — the two of them together.
 */
export type RepositoryReadMethodsOf<EntityClass extends AnyEntityClass> =
	| "count"
	| "findMany"
	| "findManyByIds"
	| `findBy${Capitalize<RepositoryFilterKeysOf<PropertiesOfClass<EntityClass>>>}`
	| `findManyBy${Capitalize<RepositoryCollectionFilterKeysOf<PropertiesOfClass<EntityClass>>>}`
	| `countBy${Capitalize<RepositoryCollectionFilterKeysOf<PropertiesOfClass<EntityClass>>>}`
	| `existsBy${Capitalize<RepositoryFilterKeysOf<PropertiesOfClass<EntityClass>>>}`;
