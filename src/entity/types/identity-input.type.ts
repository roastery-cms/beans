import type { IRawEntity } from "./raw-entity.interface";

/**
 * The all-or-nothing identity rule of a construction payload: either **none**
 * of `id`/`createdAt`/`updatedAt` appears (the base generates a fresh
 * identity), or `id` **and** `createdAt` come together, with `updatedAt` still
 * optional.
 *
 * Half a payload is a compile error here, and the base's identity extraction
 * mirrors the same guard at runtime for plain-JS callers.
 *
 * @see {@link RawContextOf} — where this union is intersected with the
 *   blueprint's input values.
 */
export type IdentityInput =
	| { id?: never; createdAt?: never; updatedAt?: never }
	| IRawEntity;
