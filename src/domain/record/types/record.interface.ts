import type { IDomainEvent } from "@/domain/domain-event/types";
import type { Context, Properties, Source } from "@roastery/terroir/symbols";
import type { RecordContextOf } from "./record-context-of.type";
import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";
import type { RecordReadValueOf } from "./record-read-value-of.type";
import type { RecordSchemaOf } from "./record-schema-of.type";
import type { SerializedRecord } from "./serialized-record.type";

/**
 * Behavioural contract of every domain record. Implemented by the
 * `DomainRecord` abstract class; useful on its own to type code that consumes
 * records without naming a concrete subclass.
 *
 * The three symbol-keyed members mirror the slots the base fills during
 * construction: the record-type name under `[Source]`, the blueprint under
 * `[Properties]` and the built property map under `[Context]`. There is no
 * `[Storage]` and no `[Events]` — see the class TSDoc for why.
 *
 * Read-only from this contract's point of view: `set`/`setMany` are
 * `protected` on `DomainRecord` itself, reachable only from a subclass's own
 * domain verbs, which is the whole point of the pillar.
 *
 * Against `IEntity`, what is missing is the identity half (`id`, `createdAt`,
 * `updatedAt`), `isUnique`, `isDestroyed` and `destroy`.
 *
 * @typeParam PropertiesShape - The record's blueprint shape. Defaults to
 *   {@link RecordPropertiesShapeBase} so the interface can be used
 *   unparameterised.
 *
 * @see `IEntity` in `@/domain/entity/types` — the identified counterpart.
 */
export interface IRecord<
	PropertiesShape extends RecordPropertiesShapeBase = RecordPropertiesShapeBase,
> {
	/** Stable record-type identifier (e.g. `"money"`), from `defineRecord()`. */
	readonly [Source]: string;

	/** The blueprint: one `ValueObject`/`Entity`/`DomainRecord` class per property. */
	readonly [Properties]: PropertiesShape;

	/** The built property map: one instance per blueprint key, no identity slice. */
	readonly [Context]: RecordContextOf<PropertiesShape>;

	/** Aggregate TypeBox schema, derived from the blueprint. Carries no identity fields. */
	get schema(): RecordSchemaOf<PropertiesShape>;

	/** Serializes to a plain object: one raw value per property. Never redacts — it must round-trip through `fromJSON`. */
	toJSON(): SerializedRecord<PropertiesShape>;

	/**
	 * Same shape as {@link IRecord.toJSON}, with every key marked sensitive
	 * replaced — the form to log or display. Does not round-trip through
	 * `fromJSON` when anything was redacted.
	 */
	toSafeJSON(): SerializedRecord<PropertiesShape>;

	/** JSON-string form of {@link IRecord.toSafeJSON} — safe to log. */
	toString(): string;

	/** Reads one key: nested instance, or wrapped raw value. */
	get<Key extends RecordDomainKeys<PropertiesShape>>(
		key: Key,
	): RecordReadValueOf<PropertiesShape, Key>;

	/** Whether the key was declared sensitive, by its value-object or by the definition. */
	isSensitive<Key extends RecordDomainKeys<PropertiesShape>>(key: Key): boolean;

	/**
	 * Forwards a **deep** drain to whatever entities this record nests; a
	 * record has no buffer of its own and never raises. Returns `[]` unless
	 * `deep` is `true`.
	 */
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
}
