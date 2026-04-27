/**
 * Symbol that keys the per-instance transient-storage accessor on every {@link Entity}.
 *
 * Reading `this[EntityStorage]` from inside a subclass returns the entity's
 * `EntityStorage` runtime instance — the small `string → string` cache used to
 * park values that don't belong on the public DTO. Symbol-keyed access keeps the
 * accessor out of the iteration walk performed by {@link Mapper.toDTO}, so anything
 * stored here is automatically excluded from the validated DTO output.
 *
 * **Naming note:** this symbol shares its name with the homonymous
 * `EntityStorage` *class* exported from `src/entity/entity-storage.ts`. The class
 * is the runtime store; this symbol is the protected accessor key. The pairing
 * is intentional and documented in the README — they are imported together by
 * convention, with the class commonly aliased to `EntityStorageImpl` at call
 * sites that need both.
 *
 * @see The `EntityStorage` class in `src/entity/entity-storage.ts` — the runtime store.
 * @see {@link Entity}.[EntityStorage] — the property this symbol keys.
 *
 * @example
 * ```ts
 * import { EntityStorage } from "@roastery/beans/entity";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public addTag(tag: string): void {
 *     const current = this[EntityStorage].get("tags") ?? "";
 *     this[EntityStorage].set("tags", current ? `${current},${tag}` : tag);
 *   }
 * }
 * ```
 */
export const EntityStorage = Symbol("entity::storage");
