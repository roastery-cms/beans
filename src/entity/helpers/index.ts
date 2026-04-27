/**
 * @module @roastery/beans/entity/helpers
 *
 * Re-exports:
 * - {@link generateUUID} — UUID v7 generator (thin wrapper around `@roastery/terroir`'s `uuid.v7()`).
 * - {@link slugify} — URL-safe slug normaliser (`lower + strict + trim`).
 */

export { generateUUID } from "./generate-uuid";
export { slugify } from "./slugify";
