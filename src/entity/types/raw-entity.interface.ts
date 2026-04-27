/**
 * Minimal data contract every entity satisfies — the three universal fields
 * stamped on by {@link Entity} (id + creation/update timestamps).
 *
 * Used as the structural base of {@link IEntity} and as the second-half of the
 * intersection in {@link Mapper.toDomain} (`dto: Input & IRawEntity`) so the
 * factory callback receives `IRawEntity` separately from the domain content.
 *
 * All fields are `readonly` because callers should never mutate the raw shape;
 * mutations flow through the entity's own `update()` lifecycle instead.
 *
 * @example
 * ```ts
 * const raw: IRawEntity = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   createdAt: "2026-04-27T10:00:00.000Z",
 * };
 * ```
 */
export interface IRawEntity {
	/** UUID string (v7 by convention). */
	readonly id: string;

	/** ISO 8601 timestamp captured at creation time. */
	readonly createdAt: string;

	/** ISO 8601 timestamp of the last `update()` — `undefined` until the entity is mutated. */
	readonly updatedAt?: string;
}
