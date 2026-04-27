/**
 * Symbol that keys the metadata-builder method on every {@link Entity}.
 *
 * Subclasses call `this[EntityContext](fieldName)` whenever they instantiate a
 * value-object so that validation errors carry both the field name and the
 * owning entity's `[EntitySource]` tag. Using a symbol (rather than a string
 * method name) prevents the helper from colliding with user-defined fields and
 * keeps it from leaking into the DTO produced by {@link Mapper.toDTO} (which
 * strips symbol-keyed properties).
 *
 * @see {@link Entity}.[EntityContext] — the method this symbol keys.
 * @see {@link IValueObjectMetadata} — the shape returned by the keyed method.
 *
 * @example
 * ```ts
 * import { EntityContext } from "@roastery/beans/entity";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   private readonly _title: DefinedStringVO;
 *
 *   public constructor(data: EntityDTO & { title: string }) {
 *     super(data, "post");
 *     this._title = DefinedStringVO.make(data.title, this[EntityContext]("title"));
 *   }
 * }
 * ```
 */
export const EntityContext = Symbol("entity::context");
