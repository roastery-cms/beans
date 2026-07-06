import type { t } from "@roastery/terroir";
import type { IEntity } from "./entity.interface";
import type { EntityDTO } from "../dtos";

/**
 * A factory that builds a fully-formed domain entity from its create input.
 *
 * When `initialProperties` is provided the factory **must** merge it into the
 * payload it constructs from — that is how an already-persisted entity keeps
 * its `id`/`createdAt` through a rebuild. `EntityUpdater` relies on this
 * contract and verifies it at runtime: a factory that ignores the argument and
 * regenerates fresh base fields makes `EntityUpdater.run` throw
 * `OperationFailedException`.
 *
 * @typeParam EntityType - The entity produced by the factory.
 * @typeParam InputType - The shape of the create input the factory consumes
 * (typically a create DTO's static type), independent of the entity's own schema.
 *
 * @param data - The create input used to build the entity.
 * @param initialProperties - Optional base entity fields (`id`/`createdAt`/`updatedAt`)
 * to preserve instead of generating them, e.g. when rebuilding an already-persisted entity.
 * @returns The constructed entity.
 *
 * @see {@link EntityUpdater} — consumes this contract for field-level updates.
 *
 * @example
 * ```ts
 * // Post follows the canonical subclass shape: a single merged payload,
 * // `EntityDTO & { title: string; slug: string }`.
 * const rebuildPost: EntityFactory<Post, PostInput> = (data, initialProperties) =>
 * 	new Post({ ...(initialProperties ?? makeEntity()), ...data });
 *
 * const post = rebuildPost({ title: "Hello", slug: "hello" });
 * ```
 */
export type EntityFactory<EntityType extends IEntity<t.TSchema>, InputType> = (
	data: InputType,
	initialProperties?: EntityDTO,
) => EntityType;
