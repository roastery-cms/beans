import type { IDomainEvent } from "@/domain/domain-event/types";
import type { Context, Properties, Source } from "@roastery/terroir/symbols";
import type { ContextOf } from "./context-of.type";
import type { EntitySchemaOf } from "./entity-schema-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { ReadValueOf } from "./read-value-of.type";
import type { ReadableKey } from "./readable-key.type";
import type { SerializedEntity } from "./serialized-entity.type";

/**
 * Behavioural contract of every domain entity. Implemented by the `Entity`
 * abstract class; useful on its own to type code that consumes entities
 * without naming a concrete subclass.
 *
 * The three symbol-keyed members mirror the slots the base class fills during
 * construction: the entity-type name under `[Source]`, the blueprint under
 * `[Properties]` and the built property map under `[Context]`.
 *
 * Deliberately read-only from this contract's point of view: `set`/`setMany`
 * are `protected` on `Entity` itself, reachable only from a subclass's own
 * business methods, so they have no place in a structural type meant for
 * code that only *consumes* an entity.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape. Defaults to
 *   {@link PropertiesShapeBase} so the interface can be used unparameterised.
 *
 * @see {@link IDomainEvent} — the shape `pullDomainEvents()` drains.
 * @see {@link IRawEntity} — the serialized identity fields.
 * @see {@link SerializedEntity} — what `toJSON()` returns.
 */
export interface IEntity<
	PropertiesShape extends PropertiesShapeBase = PropertiesShapeBase,
> {
	/** Stable entity-type identifier (e.g. `"post"`), from `defineEntity()`. */
	readonly [Source]: string;

	/** The blueprint: one `ValueObject`/`Entity` class per domain property. */
	readonly [Properties]: PropertiesShape;

	/** The built property map: identity VOs plus one instance per blueprint key. */
	readonly [Context]: ContextOf<PropertiesShape>;

	/** Entity id (UUID v7 string). */
	get id(): string;

	/** Creation timestamp (ISO 8601 string). */
	get createdAt(): string;

	/** Last-update timestamp; `undefined` until the first mutation stamps it. */
	get updatedAt(): string | undefined;

	/** Aggregate TypeBox schema, derived from the blueprint. */
	get schema(): EntitySchemaOf<PropertiesShape>;

	/** Serializes to a plain object: identity plus one raw value per property. */
	toJSON(): SerializedEntity<PropertiesShape>;

	/**
	 * Same shape as {@link IEntity.toJSON}, with every key marked sensitive
	 * replaced — the form to log or display. Does not round-trip through
	 * `fromJSON` when anything was redacted.
	 */
	toSafeJSON(): SerializedEntity<PropertiesShape>;

	/** JSON-string form of {@link IEntity.toSafeJSON} — safe to log. */
	toString(): string;

	/** Reads one key: identity string, nested instance, or wrapped raw value. */
	get<Key extends ReadableKey<PropertiesShape>>(
		key: Key,
	): ReadValueOf<PropertiesShape, Key>;

	/** Whether a key was **declared** unique (`id` always is). Reports the declaration only — it never reads storage. */
	isUnique<Key extends ReadableKey<PropertiesShape>>(key: Key): boolean;

	/** Whether the key was declared sensitive, by its value-object or by the definition. */
	isSensitive<Key extends ReadableKey<PropertiesShape>>(key: Key): boolean;

	/** Drains the buffered domain events raised via `raiseEvent`, emptying the buffer; `deep` drains nested entities too. */
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];

	/** Whether `destroy()` has already been called on this instance. */
	get isDestroyed(): boolean;

	/** Marks the entity destroyed and releases its transient `[Storage]`. Idempotent. */
	destroy(): void;
}
