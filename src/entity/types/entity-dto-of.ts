import type { t } from "@roastery/terroir";
import type { IEntity } from "./entity.interface";

/**
 * Resolves the plain-object DTO shape of an entity type by extracting the
 * TypeBox schema it was parameterised with — i.e. `t.Static<SchemaType>` for
 * an `IEntity<SchemaType>`.
 *
 * Useful whenever a generic utility receives only the entity type and needs
 * the raw (DTO-side) view of its fields. `EntityUpdater.run` uses it to
 * constrain its property/value pair to the *DTO* side of the entity
 * (raw values) rather than the domain side (getters, symbol-keyed members).
 *
 * @typeParam EntityType - The entity whose DTO shape should be resolved.
 *
 * @see {@link IEntity} — the contract the schema is extracted from.
 * @see {@link EntityUpdaterInput} — the domain-content slice of this shape.
 *
 * @example
 * ```ts
 * import type { EntityDTOOf } from "@roastery/beans/entity/types";
 *
 * // class Post extends Entity<typeof PostDTO> { ... }
 * type PostShape = EntityDTOOf<Post>;
 * // { id: string; createdAt: string; updatedAt?: string; title: string; slug: string }
 * ```
 */
export type EntityDTOOf<EntityType> =
	EntityType extends IEntity<infer SchemaType> ? t.Static<SchemaType> : never;
