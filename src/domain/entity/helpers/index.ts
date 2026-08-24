/**
 * @module @roastery/beans/domain/entity/helpers
 *
 * Re-exports:
 * - {@link entityOf} — builds an `Entity` base class already bound to a blueprint.
 * - {@link entityHas} — runtime check for whether a blueprint has a given shape.
 * - {@link blueprint} — declares a blueprint carrying domain rules (`default` / `derive`).
 * - {@link deepEquals} — structural equality over JSON-shaped DTO values.
 * - {@link generateUUID} — UUID v7 generator (thin wrapper around `@roastery/terroir`'s `uuid.v7()`).
 * - {@link uniqueKeysOf} — the keys an entity class declares as unique, `id` included.
 */

export { blueprint } from "./blueprint";
export { entityOf } from "./entity-of";
export { entityHas } from "./entity-has";
export { deepEquals } from "./deep-equals";
export { generateUUID } from "./generate-uuid";
export { uniqueKeysOf } from "./unique-keys-of";
