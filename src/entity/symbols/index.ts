/**
 * @module @roastery/beans/entity/symbols
 *
 * The five symbols that key the contract `Entity` and `IEntity` expose.
 * Re-exported in the order shown in the README's "Symbols" table — matching
 * external documentation, **not** alphabetical order.
 *
 * Re-exports:
 * - {@link EntitySource} — entity-type identifier (`"post"`, `"user"`, …).
 * - {@link EntitySchema} — abstract validation schema for the entity's DTO.
 * - {@link EntityContext} — `(name) => IValueObjectMetadata` builder method.
 * - {@link EntityStorage} — per-instance transient `string → string` store accessor.
 * - {@link EntityFactory} — abstract self-rebuild method, `(data, initialProperties?) => this`.
 */

export { EntitySource } from "./entity-source";
export { EntitySchema } from "./entity-schema";
export { EntityContext } from "./entity-context";
export { EntityStorage } from "./entity-storage";
export { EntityFactory } from "./entity-factory";
