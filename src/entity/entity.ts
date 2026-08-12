import type { IEntity } from "./types";
import {
	EntitySource,
	EntitySchema,
	EntityContext,
	EntityStorage,
} from "./symbols";
import type { Schema } from "@roastery/terroir/schema";
import { DateTimeVO, UuidVO } from "@/collections/value-objects";
import type { EntityDTO } from "./dtos";
import type { IValueObjectContext } from "@/value-object/types";
import type { t } from "@roastery/terroir";
import { EntityStorage as EntityStorageImpl } from "./entity-storage";

/**
 * Abstract base class every domain entity in the Roastery ecosystem extends.
 *
 * Provides three universal fields out-of-the-box — `id` (UUID v7), `createdAt`,
 * and `updatedAt` — each backed by a validated value-object so that an `Entity`
 * can never be constructed with a malformed timestamp or non-UUID id. State that
 * does not belong in the public DTO (cached lookups, transient flags) goes through
 * the per-instance {@link EntityStorage} accessor instead.
 *
 * The class is parameterised by the entity's TypeBox schema type so the runtime
 * DTO shape can be read straight off `entity[EntitySchema]`. Subclasses
 * **must** provide:
 *
 * - `public readonly [EntitySource]` — the entity-type name (e.g. `"post"`).
 * - `public readonly [EntitySchema]` — the {@link Schema} validating the DTO.
 *
 * **This base no longer serialises.** `Mapper` and `ParseEntityToDTOService`,
 * which turned an `Entity` into its DTO, were removed along with
 * `EntityUpdater` — the whole v1 pillar is being retired in favour of
 * `BetterEntity` (`src/entity/better-entity.ts`), which owns its own
 * `toJSON` / `fromJSON`. What remains here is a validation-only base: it
 * guarantees a well-formed identity and well-formed value-objects, and nothing
 * else. New entities should be written against `BetterEntity`.
 *
 * Construction is `protected`: subclasses receive an `EntityDTO`-shaped payload
 * (`id`, `createdAt`, `updatedAt`) plus their own domain fields, and must call
 * `super(entityDto, entitySource)` exactly once. The `[EntityContext](name)`
 * helper builds the {@link IValueObjectContext} payload that downstream value
 * objects consume — call it whenever you instantiate a VO from inside a subclass.
 *
 * @typeParam SchemaType - The TypeBox schema describing the entity's full DTO.
 *   Constrained to {@link t.TSchema}; flows into the `[EntitySchema]` field type
 *   and into {@link IEntity}.
 *
 * @see {@link IEntity} — the contract this class implements.
 * @see {@link EntitySource} — symbol keying the entity-type name.
 * @see {@link EntitySchema} — symbol keying the validation schema (homonymous with the runtime
 *   `EntitySchema` instance in `src/entity/schemas/entity.schema.ts`).
 * @see {@link EntityContext} — symbol keying the metadata-builder method.
 * @see {@link EntityStorage} — symbol keying the per-instance storage (homonymous with the
 *   runtime `EntityStorage` class).
 * @see `BetterEntity` in `src/entity/better-entity.ts` — the v2 base that supersedes this one.
 *
 * @example
 * ```ts
 * import { Entity } from "@roastery/beans";
 * import { EntitySource, EntitySchema, EntityContext } from "@roastery/beans/entity";
 * import type { EntityDTO } from "@roastery/beans/entity";
 * import { DefinedStringVO, StringDTO } from "@roastery/beans/collections";
 * import { Schema } from "@roastery/terroir/schema";
 * import { t } from "@roastery/terroir";
 *
 * const PostDTO = t.Object({ id: t.String(), createdAt: t.String(), title: StringDTO });
 * type PostInput = { title: string };
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public readonly [EntitySource] = "post";
 *   public readonly [EntitySchema] = Schema.make(PostDTO);
 *
 *   private readonly _title: DefinedStringVO;
 *
 *   public constructor(data: EntityDTO & PostInput) {
 *     super(data, "post");
 *     this._title = DefinedStringVO.make(data.title, this[EntityContext]("title"));
 *   }
 * }
 * ```
 */
export abstract class Entity<SchemaType extends t.TSchema>
	implements IEntity<SchemaType>
{
	/** Stable entity-type identifier (e.g. `"post"`, `"user"`). Set in the constructor from the `entitySource` argument and used as the `source` of every validation error the entity raises. */
	public readonly [EntitySource]: string;

	/** Validation schema for this entity's DTO. **Abstract** — every subclass binds it to the appropriate `Schema.make(...)` instance. */
	public abstract readonly [EntitySchema]: Schema<SchemaType>;

	/** Per-instance transient `string → string` store. Created fresh in the constructor; access from subclasses via `this[EntityStorage]`. */
	protected readonly [EntityStorage]: EntityStorageImpl;

	private readonly _id: UuidVO;
	private readonly _createdAt: DateTimeVO;
	private _updatedAt?: DateTimeVO;

	/** Public, immutable view of the entity id (UUID v7 string). */
	public get id(): string {
		return this._id.value;
	}

	/** Public, immutable view of the creation timestamp (ISO 8601 string). */
	public get createdAt(): string {
		return this._createdAt.value;
	}

	/**
	 * Public, immutable view of the last-update timestamp. Returns `undefined`
	 * when the entity has never been mutated through {@link Entity.update}.
	 */
	public get updatedAt(): string | undefined {
		return this._updatedAt?.value;
	}

	/**
	 * Hydrates the base entity fields from an `EntityDTO` payload and tags the
	 * instance with its source name. Each base field is constructed through the
	 * appropriate value-object so a malformed id or timestamp throws
	 * `InvalidPropertyException` before the subclass constructor body runs.
	 *
	 * @param data - Base DTO carrying `id`, `createdAt` (required) and `updatedAt` (optional).
	 * @param entitySource - The entity-type identifier; assigned to `this[EntitySource]`
	 *   and used as `IValueObjectContext.source` for every VO this entity instantiates.
	 *
	 * @throws `InvalidPropertyException` — when `data.id` is not a UUID, or any timestamp
	 *   does not parse as ISO 8601.
	 */
	protected constructor(
		{ createdAt, id, updatedAt }: EntityDTO,
		entitySource: string,
	) {
		this[EntitySource] = entitySource;

		this._id = UuidVO.make(id, this[EntityContext]("id"));
		this._createdAt = DateTimeVO.make(
			createdAt,
			this[EntityContext]("createdAt"),
		);
		this._updatedAt = updatedAt
			? DateTimeVO.make(updatedAt, this[EntityContext]("updatedAt"))
			: undefined;

		this[EntityStorage] = new EntityStorageImpl();
	}

	/**
	 * Stamps `updatedAt` to the current ISO timestamp. Intended to be called
	 * from inside subclass mutators — typically wired automatically through the
	 * `@AutoUpdate` method decorator instead of being invoked by hand.
	 *
	 * @see {@link AutoUpdate} for the decorator-driven invocation.
	 */
	protected update(): void {
		this._updatedAt = DateTimeVO.now(this[EntityContext]("updatedAt"));
	}

	/**
	 * Builds a fresh {@link IValueObjectContext} payload tagged with the entity's
	 * source name. Subclasses use it whenever they instantiate a value-object so
	 * validation errors carry both the field name and the owning entity type.
	 *
	 * @param name - Property name to embed (e.g. `"title"`, `"slug"`).
	 * @returns A `{ name, source }` literal where `source` is `this[EntitySource]`.
	 */
	public [EntityContext](name: string): IValueObjectContext {
		return {
			name,
			source: this[EntitySource],
		};
	}
}
