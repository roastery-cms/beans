/**
 * @module @roastery/beans/entity/types
 *
 * Type-only re-exports for the entity contracts.
 *
 * Re-exports:
 * - {@link IEntity} — behavioural contract over {@link IRawEntity} (adds the three symbol-keyed fields).
 * - {@link IRawEntity} — minimal data contract (`id`, `createdAt`, `updatedAt?`).
 * - {@link EntityFactory} — factory signature that builds an entity from its
 *   create input, optionally preserving base props; consumed by `EntityUpdater`.
 * - {@link EntityDTOOf} — resolves an entity type's plain-object DTO shape.
 * - {@link EntityUpdaterInput} — the DTO's domain-content slice, the input
 *   `EntityUpdater` requires of its factory.
 */

export type { IEntity } from "./entity.interface";
export type { IRawEntity } from "./raw-entity.interface";
export type { EntityFactory } from "./entity-factory";
export type { EntityDTOOf } from "./entity-dto-of";
export type { EntityUpdaterInput } from "./entity-updater-input";
