/**
 * Symbol that keys the entity-type identifier on every {@link Entity}.
 *
 * Subclasses set `this[EntitySource]` to a stable, lower-case string (e.g.
 * `"post"`, `"user"`) which is propagated as `IValueObjectMetadata.source` to
 * every value-object the entity instantiates. {@link Mapper.toDTO} also reads it
 * to build the message of `InvalidDomainDataException` when DTO validation fails,
 * so the value should identify the *entity type*, not an instance id.
 *
 * @see {@link Entity}.[EntitySource] — the property this symbol keys.
 * @see {@link IValueObjectMetadata} — `source` field is populated from this symbol.
 *
 * @example
 * ```ts
 * import { EntitySource } from "@roastery/beans/entity";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public readonly [EntitySource] = "post";
 * }
 * ```
 */
export const EntitySource = Symbol("entity::source");
