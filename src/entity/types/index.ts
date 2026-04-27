/**
 * @module @roastery/beans/entity/types
 *
 * Type-only re-exports for the entity contracts.
 *
 * Re-exports:
 * - {@link IEntity} — behavioural contract over {@link IRawEntity} (adds the three symbol-keyed fields).
 * - {@link IRawEntity} — minimal data contract (`id`, `createdAt`, `updatedAt?`).
 */

export type { IEntity } from "./entity.interface";
export type { IRawEntity } from "./raw-entity.interface";
