/**
 * The blueprint-driven `Entity` base class and its construction machinery.
 *
 * The helpers kept in this module — `isEntityClass`, `isEntity`, `rawOf`,
 * `modelFor`, `buildProperty`, `buildContext`, `buildBaseContext` and the
 * module-level caches they share — reference the `Entity` class itself
 * (`instanceof`) or state coupled to it, so extracting them to
 * `entity/helpers` would create circular imports. The decoupled machinery
 * lives in `./helpers/{extract-identity,read-definition,install-accessors}`.
 */

import { DateTimeSchema, UuidSchema } from "@/collections/schemas";
import { DateTimeVO, UuidVO } from "@/collections/value-objects";
import { metaOf } from "@/value-object/helpers";
import type { IValueObjectContext } from "@/value-object/types";
import { t } from "@roastery/terroir";
import {
	CyclicEntityDefinitionException,
	ImmutablePropertyException,
	InvalidDomainDataException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { EntityStorage } from "./entity-storage";
import { deepEquals } from "./helpers";
import { applyRuleDefaults } from "./helpers/apply-rule-defaults";
import { extractIdentity } from "./helpers/extract-identity";
import { installAccessors } from "./helpers/install-accessors";
import { definitionOf, readDefinition } from "./helpers/read-definition";
import { rulesOf } from "./helpers/rules-of";
import type {
	EntityDefinition,
	IEntity,
	IRawEntity,
	PropertiesShapeBase,
	RawContextOf,
	SerializedEntity,
} from "./types";
import type { AnyEntityClass } from "./types/any-entity-class.type";
import type { AnyEntity } from "./types/any-entity.type";
import type { AnyPropertyClass } from "./types/any-property-class.type";
import type { AnyValueObjectClass } from "./types/any-value-object-class.type";
import type { AnyValueObject } from "./types/any-value-object.type";
import type { BaseContext } from "./types/base-context.type";
import type { ContextOf } from "./types/context-of.type";
import type { EntitySchemaOf } from "./types/entity-schema-of.type";
import type { InputValueOf } from "./types/input-value-of.type";
import type { InputValuesOf } from "./types/input-values-of.type";
import type { AnyPropertyRule } from "./types/any-property-rule.type";
import type { PropertiesOfClass } from "./types/properties-of-class.type";
import type { ReadValueOf } from "./types/read-value-of.type";
import type { ReadableKey } from "./types/readable-key.type";
import { SchemaManager } from "@roastery/terroir/schema";
import {
	Context,
	Demo,
	Properties,
	Source,
	Storage,
} from "@roastery/terroir/symbols";

/**
 * The keys the base supplies on every entity. `set`/`setMany` refuse them
 * (identity is immutable through the mutation path) and `get` accepts them.
 */
const RAW_ENTITY_KEYS: ReadonlySet<PropertyKey> = new Set<PropertyKey>([
	"id",
	"createdAt",
	"updatedAt",
]);

/**
 * Derived-schema memo, keyed by the blueprint object — every instance of a
 * class shares one `t.TObject`, and the schema exists without any instance
 * (which is what makes the static `fromJSON` possible).
 *
 * Memoizing the model is also what keeps validation cheap: `SchemaManager`
 * caches each compiled validator against the schema's object identity, so a
 * stable model means the validator is compiled once per blueprint.
 */
const models = new WeakMap<PropertiesShapeBase, t.TObject>();

/** Blueprints currently being derived into schemas — the cycle guard of {@link modelFor}. */
const deriving = new Set<PropertiesShapeBase>();

/** Blueprints currently being constructed — the cycle guard of {@link buildContext}. */
const constructing = new Set<PropertiesShapeBase>();

/**
 * Runtime discriminant between the two blueprint value kinds, class side.
 *
 * @param candidate - A blueprint property class.
 * @returns `true` when the class is an `Entity` subclass.
 */
function isEntityClass(
	candidate: AnyPropertyClass,
): candidate is AnyEntityClass {
	return (
		typeof candidate === "function" && candidate.prototype instanceof Entity
	);
}

/**
 * Runtime discriminant between the two blueprint value kinds, instance side.
 *
 * @param candidate - Any value.
 * @returns `true` when the value is an `Entity` instance.
 */
function isEntity(candidate: unknown): candidate is AnyEntity {
	return candidate instanceof Entity;
}

/**
 * Reads the TypeBox model of a `ValueObject` class without constructing any
 * instance, via {@link metaOf}.
 *
 * @param valueObjectClass - The value-object class from a blueprint.
 * @returns The TypeBox schema the class declares in its `defineMeta`.
 */
function modelOfValueObject(valueObjectClass: AnyValueObjectClass): t.TSchema {
	return metaOf(valueObjectClass).schema;
}

/**
 * Builds the exception both cycle guards throw, so a blueprint cycle surfaces
 * as a diagnosable error naming the entity instead of a bare `RangeError`.
 *
 * @param source - Entity-type name of the blueprint that closed the cycle.
 * @returns The exception to throw.
 */
function cycleError(source: string): CyclicEntityDefinitionException {
	return new CyclicEntityDefinitionException(
		source,
		`Entity: the blueprint of "${source}" references itself, directly or indirectly. There is no cycle handling beyond this detection — break the cycle before modeling.`,
	);
}

/**
 * Derives (and memoizes) the aggregate schema of a blueprint: identity fields
 * plus one schema per property, recursing into nested entity blueprints.
 * Every level is emitted with `additionalProperties: false`.
 *
 * @param properties - The blueprint to derive from.
 * @param source - Entity-type name, for error context.
 * @returns The memoized aggregate model.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references
 *   itself, directly or indirectly.
 */
function modelFor(properties: PropertiesShapeBase, source: string): t.TObject {
	const cached = models.get(properties);

	if (cached) return cached;

	if (deriving.has(properties)) throw cycleError(source);

	deriving.add(properties);

	try {
		const shape: t.TProperties = {
			id: UuidSchema,
			createdAt: DateTimeSchema,
			updatedAt: t.Optional(DateTimeSchema),
		};

		for (const [key, propertyClass] of Object.entries(properties)) {
			if (!isEntityClass(propertyClass)) {
				shape[key] = modelOfValueObject(propertyClass);
				continue;
			}

			const nested = definitionOf(propertyClass);

			shape[key] = modelFor(nested.properties, nested.source);
		}

		const model = t.Object(shape, { additionalProperties: false });

		models.set(properties, model);

		return model;
	} finally {
		deriving.delete(properties);
	}
}

/**
 * Builds the identity slice of an entity's context: a fresh identity when the
 * payload carried none, validated value-objects over the given one otherwise.
 *
 * The fresh branch goes through `UuidVO.generate` and `DateTimeVO.now` — the
 * value-objects' own demo mode, which draws from the `[Meta].default` thunks
 * they already declare (`generateUUID` and the current instant) and validates
 * the result like any other value. Generating a raw string only to re-wrap it
 * would say the same thing twice.
 *
 * @param source - Entity-type name, for error context.
 * @param raw - The extracted identity, if the payload carried one.
 * @returns The three identity fields, each backed by its value-object.
 *
 * @throws `InvalidPropertyException` — when a given identity field is malformed.
 *
 * @see {@link extractIdentity} — raises `IncompleteIdentityException` earlier,
 *   when the payload carries only part of an identity.
 */
function buildBaseContext(source: string, raw?: IRawEntity): BaseContext {
	if (!raw)
		return {
			id: UuidVO.generate({ name: "id", source }),
			createdAt: DateTimeVO.now({ name: "createdAt", source }),
			updatedAt: undefined,
		};

	return {
		id: new UuidVO(raw.id, { name: "id", source }),
		createdAt: new DateTimeVO(raw.createdAt, {
			name: "createdAt",
			source,
		}),
		updatedAt: raw.updatedAt
			? new DateTimeVO(raw.updatedAt, { name: "updatedAt", source })
			: undefined,
	};
}

/**
 * Builds one blueprint property: a value-object from its raw value, a nested
 * entity from its raw payload, or either in demo mode when `useDefault` is
 * set.
 *
 * @param properties - The blueprint the key belongs to.
 * @param source - Entity-type name, for error context.
 * @param key - The property being built.
 * @param value - The raw input value (ignored in demo mode).
 * @param useDefault - Whether to build through the class's demo mode.
 * @returns The built instance.
 *
 * @throws `InvalidPropertyException` — when the value fails the property's
 *   validation.
 */
function buildProperty(
	properties: PropertiesShapeBase,
	source: string,
	key: string,
	value: unknown,
	useDefault: boolean,
): AnyValueObject | AnyEntity {
	const propertyClass = properties[key] as AnyPropertyClass;

	if (isEntityClass(propertyClass))
		return useDefault
			? (propertyClass as unknown as { demo(): AnyEntity }).demo()
			: new propertyClass(value as never);

	const context: IValueObjectContext = { name: key, source };

	return useDefault
		? (
				propertyClass as unknown as {
					demo(context: IValueObjectContext): AnyValueObject;
				}
			).demo(context)
		: new propertyClass(value as never, context);
}

/**
 * Builds an entity's full context — identity plus one built property per
 * blueprint key — applying the blueprint's domain rules and guarding against
 * blueprint cycles. The cycle guard releases on the way out, so two properties
 * of the *same* entity class in one blueprint (siblings, not a cycle) keep
 * working.
 *
 * Rules resolve in three steps, and the order is the contract: an explicit
 * value always wins, then the entity-level `default` fills what is missing,
 * then each `derive` runs over what the previous steps produced. Derivations
 * are deferred to a second pass in **blueprint order**, so a derivation reads
 * its siblings already built and normalised (a `SlugVO` sibling reads back
 * slugified, a demo sibling reads back as its declared default) — which is
 * also what makes `demo()` coherent instead of a bag of unrelated defaults.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @param properties - The blueprint to build from.
 * @param source - Entity-type name, for error context.
 * @param raw - The raw payload (`undefined` in demo mode).
 * @param useDefault - Whether the properties no rule covers fall back to their
 *   demo defaults.
 * @returns The built context.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references itself.
 * @throws `InvalidPropertyException` — when a value fails validation or the
 *   payload brings only half an identity.
 *
 * @see `applyRuleDefaults` in `./helpers/apply-rule-defaults` — the first step.
 */
function buildContext<PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
	source: string,
	raw: Record<string, unknown> | undefined,
	useDefault: boolean,
): ContextOf<PropertiesShape> {
	if (constructing.has(properties)) throw cycleError(source);

	constructing.add(properties);

	try {
		const base = buildBaseContext(source, extractIdentity(source, raw));
		const rules = rulesOf(properties) as Record<
			string,
			AnyPropertyRule | undefined
		>;

		const values = applyRuleDefaults(rules, raw ?? {});
		const built: Record<string, AnyValueObject | AnyEntity> = {};
		const pending: string[] = [];

		for (const key of Object.keys(properties)) {
			if (values[key] === undefined && rules[key]?.derive !== undefined) {
				pending.push(key);
				continue;
			}

			built[key] = buildProperty(
				properties,
				source,
				key,
				values[key],
				useDefault && values[key] === undefined,
			);

			values[key] = rawOf(built[key]);
		}

		for (const key of pending) {
			const derive = rules[key]?.derive;

			values[key] = derive?.(
				values as unknown as Readonly<InputValuesOf<PropertiesShape>>,
			);

			built[key] = buildProperty(properties, source, key, values[key], false);

			values[key] = rawOf(built[key]);
		}

		return { ...base, ...built } as ContextOf<PropertiesShape>;
	} finally {
		constructing.delete(properties);
	}
}

/**
 * Serializes one built property: `toJSON()` for a nested entity, the wrapped
 * `value` for a value-object.
 *
 * @param property - The built instance.
 * @returns Its raw form.
 */
function rawOf(property: AnyValueObject | AnyEntity): unknown {
	return isEntity(property)
		? property.toJSON()
		: (property as AnyValueObject).value;
}

/**
 * Abstract base class every domain entity extends, driven by a **blueprint**:
 * a plain object mapping each domain property to its `ValueObject` or
 * `Entity` class. The subclass declares only `defineEntity()`; construction,
 * validation, serialization, mutation and the derived accessors all come from
 * the base.
 *
 * The base supplies `id` (UUID v7), `createdAt` and `updatedAt` — they must
 * **not** appear in the blueprint. Three construction paths produce the same
 * shape:
 *
 * - `new X(payload)` — validates property by property, ignores unknown keys,
 *   generates a fresh identity unless the payload carries one (all-or-nothing:
 *   `id` and `createdAt` together, `updatedAt` optional).
 * - `X.fromJSON(row)` — static; validates the whole payload against the
 *   aggregate schema first, rejecting missing **and** unknown keys. Use it for
 *   payloads of untrusted origin.
 * - `X.demo()` — static; every value-object falls back to its declared
 *   default and nested entities recurse into their own demo mode.
 *
 * @typeParam PropertiesShape - The blueprint shape, inferred from the
 *   subclass's `typeof xProperties`.
 *
 * @see {@link IEntity} — the contract this class implements.
 * @see `AccessorsOf` in `./types` — merge it so TypeScript sees the derived accessors.
 * @see {@link EntityStorage} — the transient store under `this[Storage]`.
 *
 * @example
 * ```ts
 * const postProperties = { title: StringVO, author: Author };
 *
 * // biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
 * interface Post extends AccessorsOf<typeof postProperties> {}
 * class Post extends Entity<typeof postProperties> {
 *   protected defineEntity(): EntityDefinition<typeof postProperties> {
 *     return { properties: postProperties, source: "post" };
 *   }
 * }
 *
 * const post = new Post({ title: "Hello", author: { name: "alan" } });
 * post.title;              // "Hello" — derived accessor
 * post.author.name;        // chains: the accessor returns the nested instance
 * post.set("title", "Hi"); // stamps updatedAt once
 * post.toJSON();           // plain object, recursing into author
 * Post.fromJSON(row);      // strict static hydration
 * Post.demo();             // fixture without data
 * ```
 */
export abstract class Entity<const PropertiesShape extends PropertiesShapeBase>
	implements IEntity<PropertiesShape>
{
	/** The blueprint, as returned by the subclass's {@link Entity.defineEntity}. */
	public readonly [Properties]: PropertiesShape;

	/** The built property map: identity value-objects plus one instance per blueprint key. */
	public readonly [Context]: ContextOf<PropertiesShape>;

	/** Stable entity-type identifier (e.g. `"post"`), the `source` of every validation error. */
	public readonly [Source]: string;

	/**
	 * Per-instance transient `string → string` store for cached lookups and
	 * derived flags. `protected` — subclasses expose whatever facade they want.
	 * Never reaches {@link Entity.toJSON} or the schema, and starts empty on
	 * `fromJSON`/`demo` (statics have no source instance to carry state from).
	 */
	protected readonly [Storage]: EntityStorage;

	/**
	 * Declares what the entity **is**: its blueprint and its entity-type name.
	 *
	 * **Must be a prototype method, never a class field** — the base invokes it
	 * inside the constructor, before any field initializer runs. And it must be
	 * **pure**: `fromJSON` invokes it on a probe created without running any
	 * constructor, purely to read the blueprint before validating.
	 *
	 * @returns The blueprint and the entity-type name.
	 */
	protected abstract defineEntity(): EntityDefinition<PropertiesShape>;

	/**
	 * Builds the entity from a raw payload: one input value per blueprint key,
	 * plus an optional identity (all-or-nothing — `id` and `createdAt`
	 * together, or neither). Unknown keys are ignored; each property validates
	 * through its own class.
	 *
	 * Also installs the blueprint-derived accessors on the class prototype,
	 * once per class. A subclass may declare its own constructor and delegate
	 * to `super(...)` — it must accept the base's payload in at least one
	 * overload and forward any argument it does not recognise, because
	 * `demo()` passes a module-private sentinel through this same channel.
	 *
	 * @param context - The raw construction payload.
	 *
	 * @throws `InvalidEntityDefinitionException` — when `defineEntity` is a
	 *   class field.
	 * @throws `PropertyNameCollisionException` — when a blueprint key collides
	 *   with an existing member.
	 * @throws `CyclicEntityDefinitionException` — when the blueprint references
	 *   itself.
	 * @throws `IncompleteIdentityException` — when the payload brings only half
	 *   an identity.
	 * @throws `InvalidPropertyException` — when a value fails validation.
	 */
	public constructor(context: RawContextOf<PropertiesShape>) {
		const { properties, source } = readDefinition<PropertiesShape>(this);
		const useDefault = (context as unknown) === Demo;

		installAccessors(Object.getPrototypeOf(this) as object, properties, source);

		this[Source] = source;
		this[Properties] = properties;
		this[Storage] = new EntityStorage();
		this[Context] = buildContext(
			properties,
			source,
			useDefault ? undefined : (context as unknown as Record<string, unknown>),
			useDefault,
		);
	}

	/**
	 * Builds the entity without data: every value-object falls back to its
	 * declared default and nested entities recurse into their own demo mode. A
	 * fresh identity is still generated.
	 *
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `InvalidPropertyException` — when a value-object's default does
	 *   not pass its own model.
	 */
	public static demo<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(this: Self): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` is the concrete subclass the call was made on; replacing it with `Entity` would construct the abstract base.
		return Reflect.construct(this as never, [Demo]) as Self["prototype"];
	}

	/**
	 * Hydrates the entity from a serialized payload, strictly: the whole
	 * payload is validated against the aggregate schema **before** any
	 * value-object is built, rejecting missing and unknown keys alike. The
	 * payload's identity is preserved.
	 *
	 * @param data - The serialized entity, as produced by {@link Entity.toJSON}.
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `InvalidDomainDataException` — when the payload does not match
	 *   the aggregate schema.
	 * @throws `CyclicEntityDefinitionException` — when the blueprint references
	 *   itself, directly or indirectly.
	 */
	public static fromJSON<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(
		this: Self,
		data: SerializedEntity<PropertiesOfClass<Self>>,
	): Self["prototype"] {
		// The probe reads the blueprint without running any constructor, so
		// validation happens before any value-object is built.
		// biome-ignore lint/complexity/noThisInStatic: `this` is the concrete subclass the call was made on; replacing it with `Entity` would probe the abstract base.
		const probe = Object.create(this.prototype) as object;

		const { properties, source } = readDefinition<PropertiesShapeBase>(probe);

		if (!SchemaManager.match(modelFor(properties, source), data))
			throw new InvalidDomainDataException(source);

		// biome-ignore lint/complexity/noThisInStatic: same as above — constructing `Entity` would yield an instance of the abstract base, not the subclass.
		return Reflect.construct(this as never, [data]) as Self["prototype"];
	}

	/** Entity id (UUID v7 string). */
	public get id(): string {
		return this[Context].id.value;
	}

	/** Creation timestamp (ISO 8601 string). */
	public get createdAt(): string {
		return this[Context].createdAt.value;
	}

	/** Last-update timestamp; `undefined` until the first mutation stamps it. */
	public get updatedAt(): string | undefined {
		return this[Context].updatedAt?.value;
	}

	/**
	 * The aggregate TypeBox schema, derived from the blueprint and memoized
	 * per blueprint object — every instance of a class shares one compiled
	 * schema. Every level carries `additionalProperties: false`.
	 */
	public get schema(): EntitySchemaOf<PropertiesShape> {
		return modelFor(
			this[Properties],
			this[Source],
		) as unknown as EntitySchemaOf<PropertiesShape>;
	}

	/**
	 * Serializes the entity to a plain object: identity fields plus one raw
	 * value per blueprint key, recursing into nested entities. `updatedAt` is
	 * omitted while the entity has never been mutated.
	 *
	 * @returns The serialized entity.
	 */
	public toJSON(): SerializedEntity<PropertiesShape> {
		return Object.fromEntries(
			Object.entries(
				this[Context] as Record<string, AnyValueObject | AnyEntity | undefined>,
			)
				.filter(([, property]) => property !== undefined)
				.map(([key, property]) => [
					key,
					rawOf(property as AnyValueObject | AnyEntity),
				]),
		) as SerializedEntity<PropertiesShape>;
	}

	/** @returns The serialized entity as a JSON string. */
	public toString(): string {
		return JSON.stringify(this.toJSON());
	}

	/**
	 * Replaces one property from its raw value. Delegates to
	 * {@link Entity.setMany}, inheriting its atomicity and its `updatedAt`
	 * stamping rules.
	 *
	 * @param key - A blueprint key.
	 * @param value - The property's raw input value.
	 *
	 * @throws `ImmutablePropertyException` — when the key is an identity field.
	 * @throws `InvalidPropertyException` — when the key is outside the
	 *   blueprint or the value fails validation.
	 */
	public set<Key extends keyof PropertiesShape>(
		key: Key,
		value: InputValueOf<PropertiesShape[Key]>,
	): void {
		this.setMany({ [key]: value } as unknown as Partial<
			InputValuesOf<PropertiesShape>
		>);
	}

	/**
	 * The mutation primitive: validates every key, then builds every value,
	 * and only then assigns — a rejected value leaves the entity untouched.
	 * `updatedAt` is stamped **once**, and only if something actually changed
	 * (values equal to the current ones, compared after normalization, do not
	 * count).
	 *
	 * @param values - A partial map of blueprint keys to raw input values.
	 *
	 * @throws `ImmutablePropertyException` — when a key is an identity field
	 *   (`id`/`createdAt`/`updatedAt`); they are readable, never writable.
	 * @throws `InvalidPropertyException` — when a key is outside the blueprint
	 *   or a value fails validation.
	 */
	public setMany(values: Partial<InputValuesOf<PropertiesShape>>): void {
		const entries = Object.entries(values);

		for (const [key] of entries) {
			if (RAW_ENTITY_KEYS.has(key))
				throw new ImmutablePropertyException(key, this[Source]);

			if (!Object.hasOwn(this[Properties], key))
				throw new InvalidPropertyException(key, this[Source]);
		}

		const built = entries.map(
			([key, value]) =>
				[
					key,
					buildProperty(this[Properties], this[Source], key, value, false),
				] as const,
		);

		const domain = this[Context] as Record<string, AnyValueObject | AnyEntity>;

		let changed = false;

		for (const [key, next] of built) {
			const current = domain[key] as AnyValueObject | AnyEntity;

			if (deepEquals(rawOf(current), rawOf(next))) continue;

			domain[key] = next;
			changed = true;
		}

		if (!changed) return;

		this[Context].updatedAt = DateTimeVO.now({
			name: "updatedAt",
			source: this[Source],
		});
	}

	/**
	 * Reads one key: the raw string for an identity field, the nested
	 * **instance** for an entity-valued property (so reads chain), the wrapped
	 * raw value for a value-object property. A known key with no value yet
	 * (`updatedAt` before the first mutation) returns `undefined` — a
	 * different case from an unknown key, which throws.
	 *
	 * @param key - A blueprint key or identity field.
	 * @returns The value for the key.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside
	 *   `blueprint ∪ id/createdAt/updatedAt`.
	 */
	public get<Key extends ReadableKey<PropertiesShape>>(
		key: Key,
	): ReadValueOf<PropertiesShape, Key> {
		const name = String(key);

		if (!RAW_ENTITY_KEYS.has(name) && !Object.hasOwn(this[Properties], name))
			throw new InvalidPropertyException(name, this[Source]);

		const context = this[Context] as Record<
			string,
			AnyValueObject | AnyEntity | undefined
		>;

		const property = context[name];

		if (property === undefined)
			return undefined as ReadValueOf<PropertiesShape, Key>;

		return (
			isEntity(property) ? property : (property as AnyValueObject).value
		) as ReadValueOf<PropertiesShape, Key>;
	}
}
