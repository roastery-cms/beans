/**
 * Symbol that keys the abstract self-rebuild method on every {@link Entity}.
 *
 * Subclasses implement `this[EntityFactory](data, initialProperties)` to
 * construct a fresh instance of their own type from domain-content input,
 * optionally preserving the base props of an already-persisted entity. Generic
 * consumers that hold an entity instance (e.g. {@link EntityUpdater}) call
 * this instead of requiring a separately-wired factory function.
 *
 * **Declared as a method, not a property.** A property typed with the
 * {@link EntityFactory} (type) signature would be checked contravariantly on
 * its parameter and would reject the polymorphic `this` return the moment a
 * subclass narrows the input to its own concrete type — methods are checked
 * bivariantly, which is what lets every subclass declare its own narrower
 * input type and still satisfy the base contract. Because the return type is
 * the polymorphic `this`, implementations must cast (`as this`) when
 * returning a freshly-constructed instance — `new Post(...)` has static type
 * `Post`, not `this` (which could be a further subtype).
 *
 * **This only covers rebuilding from an existing instance.** It cannot help
 * {@link Mapper.toDomain}, which constructs an entity from a raw DTO with no
 * instance to call the method on — that path still takes an explicit factory
 * argument.
 *
 * **Naming note:** this symbol shares its name with the {@link EntityFactory}
 * type exported from `src/entity/types/entity-factory.ts`, which describes
 * the free-standing factory function shape `Mapper.toDomain` and
 * `EntityUpdater` still accept as an explicit argument. The collision is
 * intentional, matching the `EntitySchema` / `EntityStorage` pattern.
 *
 * @see {@link Entity}.[EntityFactory] — the abstract method this symbol keys.
 * @see The `EntityFactory` type in `src/entity/types/entity-factory.ts`.
 * @see {@link EntityUpdater} — the generic consumer this method is meant for.
 *
 * @example
 * ```ts
 * import { EntityFactory, EntitySchema } from "@roastery/beans/entity/symbols";
 * import { makeEntity } from "@roastery/beans/entity/factories";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public readonly [EntitySchema] = Schema.make(PostDTO);
 *
 *   public [EntityFactory](
 *     data: PostInput,
 *     initialProperties?: EntityDTO,
 *   ): this {
 *     return new Post({ ...(initialProperties ?? makeEntity()), ...data }) as this;
 *   }
 * }
 * ```
 */
export const EntityFactory = Symbol("entity::factory");
