import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";

/**
 * Every read method name available for one entity — the catalog
 * {@link RepositoryOf}'s spec is checked against.
 *
 * Three of them are fixed (`count`, `findMany`, `findManyByIds`); the rest are
 * **derived from the blueprint**, one `findBy*` per filter key and one
 * `findManyBy*` per collection filter key. `findByEmail` is in the catalog
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
	| `findManyBy${Capitalize<RepositoryCollectionFilterKeysOf<PropertiesOfClass<EntityClass>>>}`;
