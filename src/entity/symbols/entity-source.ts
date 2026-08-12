/**
 * Symbol that keys the entity-type identifier on every {@link Entity}.
 *
 * Subclasses set `this[EntitySource]` to a stable, lower-case string (e.g.
 * `"post"`, `"user"`) which is propagated as `IValueObjectContext.source` to
 * every value-object the entity instantiates, and it is what names the entity in
 * the message of any exception it raises, so the value should identify the
 * *entity type*, not an instance id.
 *
 * @see {@link Entity}.[EntitySource] — the property this symbol keys.
 * @see {@link IValueObjectContext} — `source` field is populated from this symbol.
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
