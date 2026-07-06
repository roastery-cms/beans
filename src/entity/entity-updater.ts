import type { t } from "@roastery/terroir";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import { DateTimeVO } from "@/collections/value-objects";
import { Mapper } from "@/mapper";
import type { EntityDTO } from "./dtos";
import {
	EntityContext,
	EntityFactory as EntityFactorySymbol,
	EntitySchema,
	EntitySource,
} from "./symbols";
import type {
	EntityDTOOf,
	EntityUpdaterInput,
	IEntity,
	IRawEntity,
} from "./types";
import { deepEquals } from "./helpers";

/**
 * The base entity props {@link EntityUpdater.run} refuses to touch at
 * runtime — mirrors `keyof IRawEntity`, which the `Property` generic already
 * excludes at compile time. The runtime set protects plain-JavaScript callers,
 * for whom the type-level exclusion is erased.
 */
const RAW_ENTITY_KEYS: ReadonlySet<PropertyKey> = new Set<PropertyKey>([
	"id",
	"createdAt",
	"updatedAt",
]);

/**
 * Stateful wrapper that applies field-level updates to an entity by
 * round-tripping it through the {@link Mapper}: serialise to DTO, mutate the
 * requested field, validate, stamp `updatedAt`, and rebuild via the entity's
 * own {@link EntityFactory} (the symbol) method.
 *
 * Because entities keep their fields behind validated value-objects, mutating
 * one in place would bypass validation. The updater instead rebuilds the whole
 * entity from the mutated DTO, so every update flows through the same
 * factory + value-object pipeline as initial construction.
 *
 * The updater **accumulates** updates: each effective {@link EntityUpdater.run}
 * replaces the managed instance (exposed via {@link EntityUpdater.current}),
 * so successive calls compose instead of each starting over from the original
 * entity. When an update turns out to be a no-op — the new value is
 * structurally equal to the current one, before or after value-object
 * normalisation — the updater returns the **same** instance and does not
 * stamp `updatedAt`.
 *
 * **Transient state is not preserved.** Rebuilding goes through the DTO, so
 * anything the mapper excludes — `[EntityStorage]` contents and `__`-prefixed
 * fields — is reset to constructor defaults on every effective update. Do not
 * manage entities whose transient state must survive mutations.
 *
 * @typeParam EntityType - The concrete entity under management. The
 *   `[EntityFactory]` method's input is derived from it: the DTO's domain
 *   content (`Omit<t.Static<SchemaType>, keyof IRawEntity>`).
 *
 * @see {@link Mapper} — performs the DTO round-trip (`toDTO` / `toDomain`).
 * @see {@link EntityFactory} (the symbol) — the entity's own self-rebuild
 *   method, invoked to rebuild the mutated DTO into a fresh instance.
 * @see {@link IRawEntity} — the base fields (`id`, `createdAt`, `updatedAt`)
 *   excluded from `run`'s accepted property names.
 *
 * @example
 * ```ts
 * // Post implements `[EntityFactory]` — see the Entity class doc.
 * const updater = new EntityUpdater(post);
 * const renamed = updater.run("title", "New title");
 * // renamed.updatedAt is freshly stamped; id/createdAt are preserved.
 * updater.current === renamed; // true
 * ```
 */
export class EntityUpdater<EntityType extends IEntity<t.TSchema>> {
	/**
	 * @param entity - The entity instance to manage. Replaced on every
	 *   effective {@link EntityUpdater.run} so updates accumulate.
	 */
	public constructor(private entity: EntityType) {}

	/**
	 * The entity instance currently under management — the original one until
	 * the first effective {@link EntityUpdater.run}, the latest rebuilt
	 * instance afterwards.
	 */
	public get current(): EntityType {
		return this.entity;
	}

	/**
	 * Sets `property` to `value` on the entity's DTO, validates the result
	 * against the entity's `[EntitySchema]`, stamps `updatedAt` (through
	 * {@link DateTimeVO.now}, the same clock the `Entity.update()` lifecycle
	 * uses) and rebuilds the entity through its own `[EntityFactory]` method.
	 *
	 * No-op updates short-circuit: when `value` is structurally equal to the
	 * current DTO value — or normalises to it during the rebuild (e.g. a
	 * `SlugVO` slugifying `"Hello World"` back into the current
	 * `"hello-world"`) — the managed instance is returned unchanged and
	 * `updatedAt` is **not** stamped.
	 *
	 * The base entity props are excluded from `Property` at the type level and
	 * rejected at runtime: `id`/`createdAt` are immutable and `updatedAt` is
	 * owned by the updater.
	 *
	 * @typeParam Property - A domain-field key of the entity's DTO
	 *   (never `id`, `createdAt` or `updatedAt`).
	 *
	 * @param property - The DTO field to update.
	 * @param value - The new raw (DTO-side) value for the field.
	 * @returns The entity under management after the update — a rebuilt
	 *   instance when the value changed, the same instance when it did not.
	 *
	 * @throws `InvalidPropertyException` — when `property` is one of the base
	 *   entity props (runtime guard for plain-JavaScript callers).
	 * @throws `InvalidDomainDataException` — when the current entity fails its
	 *   own schema during serialisation ({@link Mapper.toDTO}), or when the
	 *   mutated DTO no longer matches `[EntitySchema]` (the invalid value is
	 *   rejected *before* the `[EntityFactory]` method runs).
	 * @throws `OperationFailedException` — when the entity's `[EntityFactory]`
	 *   implementation does not preserve its identity (`id`/`createdAt`), i.e.
	 *   it ignored the `initialProperties` argument it received.
	 * @throws `InvalidPropertyException` — when a value-object built inside
	 *   `[EntityFactory]` rejects the mutated data while rebuilding.
	 */
	public run<
		Property extends Exclude<keyof EntityDTOOf<EntityType>, keyof IRawEntity>,
	>(property: Property, value: EntityDTOOf<EntityType>[Property]): EntityType {
		if (RAW_ENTITY_KEYS.has(property))
			throw new InvalidPropertyException(
				String(property),
				this.entity[EntitySource],
			);

		const before = Mapper.toDTO(this.entity) as EntityDTO &
			EntityDTOOf<EntityType>;

		if (deepEquals(before[property], value)) return this.entity;

		const mutated = { ...before };
		(mutated as EntityDTOOf<EntityType>)[property] = value;
		mutated.updatedAt = DateTimeVO.now(
			this.entity[EntityContext]("updatedAt"),
		).value;

		if (!this.entity[EntitySchema].match(mutated))
			throw new InvalidDomainDataException(this.entity[EntitySource]);

		const rebuilt = Mapper.toDomain(
			mutated as unknown as EntityUpdaterInput<EntityType> & IRawEntity,
			(data, entityProps) =>
				this.entity[EntityFactorySymbol](data, entityProps),
		);

		if (rebuilt.id !== before.id || rebuilt.createdAt !== before.createdAt)
			throw new OperationFailedException(
				this.entity[EntitySource],
				`EntityUpdater.run: the entity's [EntityFactory] implementation did not preserve its identity (id/createdAt) — it must merge the initialProperties it receives.`,
			);

		const after = Mapper.toDTO(rebuilt) as EntityDTO & EntityDTOOf<EntityType>;

		if (deepEquals(after[property], before[property])) return this.entity;

		this.entity = rebuilt;

		return rebuilt;
	}
}
