/**
 * @module @roastery/beans/entity/helpers
 *
 * Re-exports:
 * - {@link deepEquals} — structural equality over JSON-shaped DTO values.
 * - {@link generateUUID} — UUID v7 generator (thin wrapper around `@roastery/terroir`'s `uuid.v7()`).
 * - {@link slugify} — URL-safe slug normaliser (`lower + strict + trim`).
 */

export { deepEquals } from "./deep-equals";
export { generateUUID } from "./generate-uuid";
export { slugify } from "./slugify";
