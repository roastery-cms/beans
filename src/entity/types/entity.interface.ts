import type { Context, Properties, Source } from "@roastery/terroir/symbols";
import type { ContextOf } from "./context-of.type";
import type { EntitySchemaOf } from "./entity-schema-of.type";
import type { InputValueOf } from "./input-value-of.type";
import type { InputValuesOf } from "./input-values-of.type";
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
 * @typeParam PropertiesShape - The entity's blueprint shape. Defaults to
 *   {@link PropertiesShapeBase} so the interface can be used unparameterised.
 *
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

	/** JSON-string form of {@link IEntity.toJSON}. */
	toString(): string;

	/** Replaces one property from its raw value. Delegates to `setMany`. */
	set<Key extends keyof PropertiesShape>(
		key: Key,
		value: InputValueOf<PropertiesShape[Key]>,
	): void;

	/** Atomically replaces many properties; stamps `updatedAt` once if anything changed. */
	setMany(values: Partial<InputValuesOf<PropertiesShape>>): void;

	/** Reads one key: identity string, nested instance, or wrapped raw value. */
	get<Key extends ReadableKey<PropertiesShape>>(
		key: Key,
	): ReadValueOf<PropertiesShape, Key>;
}
