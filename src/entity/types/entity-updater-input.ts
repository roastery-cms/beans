import type { EntityDTOOf } from "./entity-dto-of";
import type { IRawEntity } from "./raw-entity.interface";

/**
 * The domain-content slice of an entity's DTO — everything except the base
 * props (`id`, `createdAt`, `updatedAt`). This is exactly what
 * `Mapper.toDomain` hands to the factory, so `EntityUpdater` requires its
 * factory to consume this shape: a factory typed for a different input
 * (extra or missing fields) fails to compile instead of silently receiving
 * data it does not expect.
 *
 * Consumers typically use it to type their rebuild factories:
 * `EntityFactory<Post, EntityUpdaterInput<Post>>`.
 *
 * @typeParam EntityType - The entity whose DTO content shape should be resolved.
 *
 * @see {@link EntityDTOOf} — the full DTO shape this slices.
 * @see {@link EntityFactory} — the factory signature that consumes it.
 * @see {@link IRawEntity} — the base props excluded from the slice.
 *
 * @example
 * ```ts
 * import type { EntityFactory, EntityUpdaterInput } from "@roastery/beans/entity/types";
 * import { makeEntity } from "@roastery/beans/entity/factories";
 *
 * // class Post extends Entity<typeof PostDTO> { ... }
 * type PostInput = EntityUpdaterInput<Post>; // { title: string; slug: string }
 *
 * const rebuildPost: EntityFactory<Post, PostInput> = (data, initialProperties) =>
 * 	new Post({ ...(initialProperties ?? makeEntity()), ...data });
 * ```
 */
export type EntityUpdaterInput<EntityType> = Omit<
	EntityDTOOf<EntityType>,
	keyof IRawEntity
>;
