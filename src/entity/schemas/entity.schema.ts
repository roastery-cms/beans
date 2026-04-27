import { Schema } from "@roastery/terroir/schema";
import { EntityDTO } from "../dtos";

/**
 * Runtime `Schema` instance for {@link EntityDTO}. Singleton — instantiated at
 * module load so every consumer shares the same compiled validator.
 *
 * Use it to validate raw input that should match the base entity shape:
 *
 * ```ts
 * import { EntitySchema } from "@roastery/beans/entity";
 *
 * EntitySchema.match({ id: "…", createdAt: "…" }); // true
 * EntitySchema.match({ id: 42 }); // false
 * ```
 *
 * **Naming note:** this runtime constant shares its name with the
 * `EntitySchema` *symbol* exported from `src/entity/symbols/entity-schema.ts`.
 * The symbol is the property *key* on `Entity`/`IEntity`; this constant is
 * one possible *value* (specifically, the validator for the base `EntityDTO`).
 * Concrete entities pass their **own** `Schema.make(MyEntityDTO)` to that key,
 * not this base instance.
 *
 * @see {@link EntityDTO} — the schema this validator wraps.
 * @see The `EntitySchema` symbol in `src/entity/symbols/entity-schema.ts`.
 */
export const EntitySchema = Schema.make(EntityDTO);
