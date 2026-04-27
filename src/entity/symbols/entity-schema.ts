/**
 * Symbol that keys the abstract validation-schema property on every {@link Entity}.
 *
 * Subclasses bind `this[EntitySchema]` to a concrete `Schema.make(...)` instance
 * so that {@link Mapper.toDTO} can validate the produced DTO against the entity's
 * declared shape without any extra registry. Because the property is symbol-keyed,
 * it stays out of the DTO produced by the mapper (which iterates only string keys
 * and strips the `_` / `__` prefixes).
 *
 * **Naming note:** this symbol shares its name with the runtime
 * `EntitySchema` instance exported from `src/entity/schemas/entity.schema.ts`,
 * which validates the **base** `EntityDTO`. The symbol is the *key*; that runtime
 * value is one possible *value*. The collision is intentional and documented in
 * the README.
 *
 * @see {@link Entity}.[EntitySchema] — the abstract property this symbol keys.
 * @see The runtime `EntitySchema` instance in `src/entity/schemas/entity.schema.ts`.
 *
 * @example
 * ```ts
 * import { EntitySchema } from "@roastery/beans/entity";
 * import { Schema } from "@roastery/terroir/schema";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public readonly [EntitySchema] = Schema.make(PostDTO);
 * }
 * ```
 */
export const EntitySchema = Symbol("entity::schema");
