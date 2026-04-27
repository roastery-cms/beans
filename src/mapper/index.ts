/**
 * @module @roastery/beans/mapper
 *
 * Re-exports:
 * - {@link Mapper} — the `as const` namespace exposing `toDTO` (Entity → DTO,
 *   validated) and `toDomain` (DTO → Entity, via caller-provided factory).
 */

export { Mapper } from "./mapper";
