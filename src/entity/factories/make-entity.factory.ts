import type { EntityDTO } from "@/entity/dtos";
import { generateUUID } from "@/entity/helpers";

/**
 * Produces a fresh {@link EntityDTO} payload — a brand-new id (UUID v7), the
 * current ISO timestamp for `createdAt`, and an explicit `undefined` for
 * `updatedAt` (the entity has not yet been mutated).
 *
 * **Returns a DTO, not an entity instance.** Despite the name, the factory does
 * not construct an `Entity`; it produces the base data the constructor expects.
 * Useful in tests and seed scripts that need a valid `EntityDTO` without going
 * through a domain factory.
 *
 * The explicit `updatedAt: undefined` (rather than omitting the field) keeps the
 * returned object structurally identical regardless of how strict-property-checks
 * elsewhere read it.
 *
 * @returns A fresh `EntityDTO` populated with a v7 UUID and the current timestamp.
 *
 * @example
 * ```ts
 * import { makeEntity } from "@roastery/beans/entity";
 *
 * const data = makeEntity();
 * // { id: "<uuid-v7>", createdAt: "<iso-string>", updatedAt: undefined }
 * ```
 */
export function makeEntity(): EntityDTO {
	return {
		id: generateUUID(),
		createdAt: new Date().toISOString(),
		updatedAt: undefined,
	};
}
