/**
 * @module @roastery/beans/entity/helpers
 *
 * Re-exports:
 * - {@link blueprint} — declares a blueprint carrying domain rules (`default` / `derive`).
 * - {@link deepEquals} — structural equality over JSON-shaped DTO values.
 * - {@link generateUUID} — UUID v7 generator (thin wrapper around `@roastery/terroir`'s `uuid.v7()`).
 */

export { blueprint } from "./blueprint";
export { deepEquals } from "./deep-equals";
export { generateUUID } from "./generate-uuid";
