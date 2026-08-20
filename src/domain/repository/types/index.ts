/**
 * @module @roastery/beans/domain/repository/types
 *
 * The repository pillar: type-only ports, derived from an entity's own
 * blueprint. {@link RepositoryOf} is the entry point — it builds a port from a
 * spec of the methods it needs, checked against a catalog the blueprint
 * generates, so `findByEmail` exists only because the entity declares `email`
 * and takes a `string` only because that key is an `EmailVO`.
 *
 * Nothing here runs. There is no factory, no symbol and no runtime in this
 * pillar — `toJSON`/`fromJSON` are still the persistence boundary, and what
 * sits on the other side of these methods is still yours to write.
 *
 * The `ICan*` contracts are the unit a use case asks for in its `Deps`
 * (`{ users: ICanReadId<typeof User> & ICanUpdate<typeof User> }`);
 * {@link RepositoryOf} is what an adapter implements. The supporting aliases
 * the generator is built from (`RepositoryContractOf`,
 * `SelectedRepositoryMethodsOf`, `UnionToIntersection`, …) live in sibling
 * `*.type.ts` files and stay out of this barrel — reachable by direct path
 * when needed.
 *
 * Re-exports, grouped by what they're for:
 * - **Generator** — {@link RepositoryOf}.
 * - **Read capabilities** — {@link ICanCount}, {@link ICanReadBy},
 *   {@link ICanCountBy}, {@link ICanExistsBy}, {@link ICanReadId},
 *   {@link ICanReadMany}, {@link ICanReadManyBy}, {@link ICanReadManyByIds}.
 * - **Write capabilities** — {@link ICanCreate}, {@link ICanDelete},
 *   {@link ICanUpdate}.
 * - **Whole catalogs** — {@link IEntityReader}, {@link IEntityRepository},
 *   {@link IEntityWriter}.
 * - **Projections** — {@link ReaderOf}, {@link WriterOf}.
 * - **Spec vocabulary** — {@link RepositoryGroupedSpecOf},
 *   {@link RepositoryMethodsOf}, {@link RepositoryReadMethodsOf},
 *   {@link RepositorySpecOf}, {@link RepositoryWriteMethods}.
 * - **Supporting shapes** — {@link RepositoryCollectionFilterKeysOf},
 *   {@link RepositoryExtraMethodsBase}, {@link RepositoryFilterKeysOf},
 *   {@link RepositoryMode}, {@link RepositoryOrderKeysOf},
 *   {@link RepositoryPageOf}.
 */

export type { ICanCount } from "./ican-count.interface";
export type { ICanCountBy } from "./ican-count-by.type";
export type { ICanCreate } from "./ican-create.interface";
export type { ICanDelete } from "./ican-delete.interface";
export type { ICanExistsBy } from "./ican-exists-by.type";
export type { ICanReadBy } from "./ican-read-by.type";
export type { ICanReadId } from "./ican-read-id.type";
export type { ICanReadMany } from "./ican-read-many.interface";
export type { ICanReadManyBy } from "./ican-read-many-by.type";
export type { ICanReadManyByIds } from "./ican-read-many-by-ids.interface";
export type { ICanUpdate } from "./ican-update.interface";
export type { IEntityReader } from "./ientity-reader.type";
export type { IEntityRepository } from "./ientity-repository.type";
export type { IEntityWriter } from "./ientity-writer.type";
export type { ReaderOf } from "./reader-of.type";
export type { RepositoryCollectionFilterKeysOf } from "./repository-collection-filter-keys-of.type";
export type { RepositoryExtraMethodsBase } from "./repository-extra-methods-base.type";
export type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";
export type { RepositoryGroupedSpecOf } from "./repository-grouped-spec-of.type";
export type { RepositoryMethodsOf } from "./repository-methods-of.type";
export type { RepositoryMode } from "./repository-mode.type";
export type { RepositoryOf } from "./repository-of.type";
export type { RepositoryOrderKeysOf } from "./repository-order-keys-of.type";
export type { RepositoryPageOf } from "./repository-page-of.type";
export type { RepositoryReadMethodsOf } from "./repository-read-methods-of.type";
export type { RepositorySensitiveKeysOf } from "./repository-sensitive-keys-of.type";
export type { RepositorySpecOf } from "./repository-spec-of.type";
export type { RepositorySuppressedNamesOf } from "./repository-suppressed-names-of.type";
export type { RepositoryWriteMethods } from "./repository-write-methods.type";
export type { WriterOf } from "./writer-of.type";
