/**
 * The blueprint-driven `Entity` base class and its construction machinery.
 *
 * The helpers kept in this module — `isEntityClass`, `isEntity`, `rawOf`,
 * `modelFor`, `buildProperty`, `buildContext` and the module-level caches they
 * share — reference the `Entity` class itself (`instanceof`) or state coupled
 * to it, so extracting them to `entity/helpers` would create circular imports.
 * `BoundEntity` is here for the same reason, one step stronger: it `extends
 * Entity`, so it must be evaluated after the class exists — a sibling module
 * would throw `ReferenceError: Cannot access 'Entity' before initialization`
 * on some import orders.
 *
 * Everything that does *not* touch the class lives in
 * `./helpers/{accepts-undefined,build-base-context,extract-identity,
 * model-of-value-object,raw-entity-keys,read-definition}`, imported back by
 * direct path; the parts both pillars share are in `@/shared/helpers`.
 */

import { DateTimeVO } from "@/domain/collections/value-objects";
import type { IDomainEvent } from "@/domain/domain-event/types";
import type { IValueObjectContext } from "@/domain/value-object/types";
import {
	ImmutablePropertyException,
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { applyRuleDefaults } from "@/shared/helpers/apply-rule-defaults";
import { installAccessors } from "@/shared/helpers/install-accessors";
import { redactIfSensitive } from "@/shared/redaction/redact-if-sensitive";
import { resolveSensitiveKeys } from "@/shared/redaction/resolve-sensitive-keys";
import type { ISensitiveKey } from "@/shared/redaction/sensitive-keys-of";
import { rulesOf } from "@/shared/helpers/rules-of";
import {
	type AnySetHandlers,
	readSetHandlers,
} from "@/shared/helpers/read-set-handlers";
import { EntityStorage } from "./entity-storage";
import { deepEquals } from "./helpers/deep-equals";
import { buildBaseContext } from "./helpers/build-base-context";
import { cycleError } from "@/shared/helpers/cycle-error";
import { isValueObject } from "@/shared/helpers/is-value-object";
import { isWrapper } from "@/shared/helpers/is-wrapper";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";
import { rawOf } from "@/shared/helpers/raw-of";
import { resolveUniqueKeys } from "./helpers/resolve-unique-keys";
import { extractIdentity } from "./helpers/extract-identity";
import { modelFor } from "./helpers/model-for";
import { RAW_ENTITY_KEYS } from "./helpers/raw-entity-keys";
import { readDefinition } from "./helpers/read-definition";
import type {
	EntityDefinition,
	IEntity,
	PropertiesShapeBase,
	RawContextOf,
	SerializedEntity,
} from "./types";
import type { AnyEntity } from "./types/any-entity.type";
import type { AnyRecord } from "@/domain/record/types/any-record.type";
import type { AnyPropertyClass } from "./types/any-property-class.type";
import type { AnyWrapper } from "@/domain/wrapper/types/any-wrapper.type";
import type { AnyValueObject } from "./types/any-value-object.type";
import type { ContextOf } from "./types/context-of.type";
import type { EntitySchemaOf } from "./types/entity-schema-of.type";
import type { InputValueOf } from "./types/input-value-of.type";
import type { InputValuesOf } from "./types/input-values-of.type";
import type { AnyPropertyRule } from "./types/any-property-rule.type";
import type { PropertiesOfClass } from "./types/properties-of-class.type";
import type { ReadValueOf } from "./types/read-value-of.type";
import type { ReadableKey } from "./types/readable-key.type";
import type { SetHandlersOf } from "./types/set-handlers-of.type";
import { SchemaManager } from "@roastery/terroir/schema";
import {
	Context,
	Demo,
	Events,
	Properties,
	Source,
	Storage,
} from "@roastery/terroir/symbols";

/** Blueprints currently being constructed — the cycle guard of {@link buildContext}. */
const constructing = new Set<PropertiesShapeBase>();

/**
 * Builds one blueprint property: a value-object from its raw value, a nested
 * entity or record from its raw payload, or any of them in demo mode when
 * `useDefault` is set.
 *
 * Entity and record take the **same** branch: both construct from a single
 * payload argument and both expose a no-argument `demo()`. Only a value-object
 * differs, needing the `{ name, source }` identification context — which is
 * why the discriminant is `isValueObjectClass` rather than a three-way test.
 * Telling an entity from a record is only ever needed for schema derivation.
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
): AnyValueObject | AnyEntity | AnyRecord | AnyWrapper {
	const propertyClass = properties[key] as AnyPropertyClass;

	if (!isValueObjectClass(propertyClass))
		return useDefault
			? (propertyClass as unknown as { demo(): AnyEntity }).demo()
			: new (propertyClass as unknown as new (payload: never) => AnyEntity)(
					value as never,
				);

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
 * @param handlers - The `onSet` map, run per key just before its value is
 *   built. A handler only fires for a key that has a raw value to set, so a
 *   demo-mode fallback fires nothing.
 * @returns The built context.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references itself.
 * @throws `InvalidPropertyException` — when a value fails validation or the
 *   payload brings only half an identity.
 *
 * @see `applyRuleDefaults` in `@/shared/helpers/apply-rule-defaults` — the first step.
 */
function buildContext<PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
	source: string,
	raw: Record<string, unknown> | undefined,
	useDefault: boolean,
	handlers: AnySetHandlers,
): ContextOf<PropertiesShape> {
	if (constructing.has(properties)) throw cycleError(source, "Entity");

	constructing.add(properties);

	try {
		const base = buildBaseContext(source, extractIdentity(source, raw));
		const rules = rulesOf(properties) as Record<
			string,
			AnyPropertyRule | undefined
		>;

		const values = applyRuleDefaults(rules, raw ?? {});
		const built: Record<
			string,
			AnyValueObject | AnyEntity | AnyRecord | AnyWrapper
		> = {};
		const pending: string[] = [];

		for (const key of Object.keys(properties)) {
			if (values[key] === undefined && rules[key]?.derive !== undefined) {
				pending.push(key);
				continue;
			}

			if (values[key] !== undefined)
				handlers[key]?.(values[key] as never, values as never);

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

			if (values[key] !== undefined)
				handlers[key]?.(values[key] as never, values as never);

			built[key] = buildProperty(properties, source, key, values[key], false);

			values[key] = rawOf(built[key]);
		}

		return { ...base, ...built } as ContextOf<PropertiesShape>;
	} finally {
		constructing.delete(properties);
	}
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
 * @see {@link Entity.raiseEvent} and {@link Entity.pullDomainEvents} — the domain-event buffer under `this[Events]`.
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
 *
 *   public rename(title: string): void {
 *     this.set("title", title); // set/setMany are protected — only reachable from here
 *   }
 * }
 *
 * const post = new Post({ title: "Hello", author: { name: "alan" } });
 * post.title;              // "Hello" — derived accessor
 * post.author.name;        // chains: the accessor returns the nested instance
 * post.rename("Hi");       // stamps updatedAt once
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
	 * Per-instance buffer of domain events raised via {@link Entity.raiseEvent},
	 * drained by {@link Entity.pullDomainEvents}. `protected`, like `[Storage]`
	 * — subclasses go through the two methods rather than touching this
	 * directly. Never reaches {@link Entity.toJSON} or the schema, and starts
	 * empty on `fromJSON`/`demo` (statics have no source instance to carry
	 * state from).
	 */
	protected readonly [Events]: IDomainEvent[];

	/**
	 * Which keys {@link Entity.toSafeJSON} replaces, and with what. Resolved
	 * once per instance from the two declaring sources — each value-object's
	 * own `sensitive` flag, plus any extra key `defineEntity` named — over a
	 * memo shared by every instance of the class.
	 */
	readonly #sensitive: ReadonlyMap<string, ISensitiveKey>;

	/**
	 * Which keys {@link Entity.isUnique} reports as unique. Resolved once per
	 * instance from `id` plus the two declaring sources — each value-object's
	 * own `unique` flag, and any extra key `defineEntity` named — over a memo
	 * shared by every instance of the class.
	 */
	readonly #unique: ReadonlySet<string>;

	/**
	 * Whether {@link Entity.destroy} has been called. A true JS private field,
	 * not a terroir symbol slot — nothing outside this class needs to key off
	 * it, {@link Entity.isDestroyed} is the read surface.
	 */
	#destroyed = false;

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
		const { properties, sensitive, source, unique } =
			readDefinition<PropertiesShape>(this);
		const useDefault = (context as unknown) === Demo;

		installAccessors(
			Object.getPrototypeOf(this) as object,
			properties,
			source,
			"Entity",
		);

		this.#sensitive = resolveSensitiveKeys(properties, sensitive);
		this.#unique = resolveUniqueKeys(properties, unique);
		this[Source] = source;
		this[Properties] = properties;
		this[Storage] = new EntityStorage();
		this[Events] = [];
		this[Context] = buildContext(
			properties,
			source,
			useDefault ? undefined : (context as unknown as Record<string, unknown>),
			useDefault,
			readSetHandlers(this, "Entity"),
		);
	}

	/**
	 * The per-property business rules this entity runs **before** a value is
	 * built — on construction (`new`, `fromJSON`, `demo`) and on every
	 * `set`/`setMany`. The base returns an empty map; override it to declare a
	 * handler per blueprint key.
	 *
	 * Each handler receives the raw value about to be set plus the same
	 * read-only view of the whole raw payload a `derive` rule gets. Its return
	 * is `void`: a rule enforces by **throwing** — the exception is the
	 * domain's own choice — and never rewrites the value. Normalising stays the
	 * value-object's `transform`.
	 *
	 * Four things follow from where it runs, and all four are the contract:
	 *
	 * - A handler fires only when there is a raw value to set: an explicit
	 *   payload value, a blueprint `default`, or a `derive` result. A key
	 *   falling back to its own value-object's default fires nothing — so
	 *   `demo()` fires only the derived keys.
	 * - It sees the value **before** the value-object validates it: the
	 *   business rule precedes the schema.
	 * - On construction, `raw` shows siblings built earlier already normalised
	 *   and siblings built later as `undefined` — blueprint order, exactly as
	 *   `derive` already behaves.
	 * - On mutation it fires **per attempted write**, not per effective change:
	 *   whether a value actually differs is only known after it is built, and
	 *   running the handlers first is what keeps `setMany` atomic.
	 *
	 * **Must be a prototype method, never a class field**, and must be pure —
	 * the base invokes it inside the constructor, before the `[Context]` slot
	 * exists, so it must not read `this`. That is exactly why the handlers take
	 * the raw payload as an argument.
	 *
	 * @returns The handler map, keyed by blueprint property.
	 *
	 * @see `SetHandlersOf` in `./types/set-handlers-of.type` — the returned shape.
	 * @see `blueprint` in `./helpers/blueprint` — the producing side, for a
	 *   value a rule computes rather than checks.
	 *
	 * @example
	 * ```ts
	 * class Post extends entityOf(postProperties, "post") {
	 *   protected override onSet(): SetHandlersOf<typeof postProperties> {
	 *     return {
	 *       title: (value, raw) => {
	 *         if (raw.hidden && value.length > 40)
	 *           throw new InvalidPropertyException("title", "post");
	 *       },
	 *     };
	 *   }
	 * }
	 * ```
	 */
	protected onSet(): SetHandlersOf<PropertiesShape> {
		return {};
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
				this[Context] as Record<
					string,
					AnyValueObject | AnyEntity | AnyRecord | AnyWrapper | undefined
				>,
			)
				.filter(([, property]) => property !== undefined)
				.map(([key, property]) => [
					key,
					rawOf(property as AnyValueObject | AnyEntity),
				]),
		) as SerializedEntity<PropertiesShape>;
	}

	/**
	 * The same object {@link Entity.toJSON} produces, with every key marked
	 * sensitive replaced — the form to hand a logger, an error report or any
	 * other place the data is *displayed* rather than stored.
	 *
	 * Recurses into nested entities, each applying its own declared sensitive
	 * keys, so an aggregate is safe all the way down.
	 *
	 * The replacement comes from the value-object's own `redactWith`, or from
	 * `configureRedaction({ placeholder })`. **The result does not round-trip
	 * through `fromJSON`** when anything was redacted — that is the whole point
	 * of keeping it separate from `toJSON`, which stays lossless because it is
	 * the persistence contract.
	 *
	 * @returns The serialized entity, sensitive keys replaced.
	 *
	 * @see {@link Entity.toJSON} — the lossless counterpart, for persistence.
	 */
	public toSafeJSON(): SerializedEntity<PropertiesShape> {
		return Object.fromEntries(
			Object.entries(
				this[Context] as Record<
					string,
					AnyValueObject | AnyEntity | AnyRecord | AnyWrapper | undefined
				>,
			)
				.filter(([, property]) => property !== undefined)
				.map(([key, property]) => [
					key,
					isValueObject(property)
						? redactIfSensitive(
								this.#sensitive,
								key,
								this[Source],
								property.value,
							)
						: (property as AnyEntity | AnyRecord | AnyWrapper).toSafeJSON(),
				]),
		) as SerializedEntity<PropertiesShape>;
	}

	/** @returns The serialized entity as a JSON string, sensitive keys replaced. */
	public toString(): string {
		return JSON.stringify(this.toSafeJSON());
	}

	/**
	 * Node's inspect hook, so `console.log(entity)` shows the redacted view
	 * rather than the raw `[Context]` instances. `toJSON` is deliberately not
	 * routed through here — persisting must still see the real values.
	 *
	 * @returns The redacted serialized entity.
	 */
	public [Symbol.for(
		"nodejs.util.inspect.custom",
	)](): SerializedEntity<PropertiesShape> {
		return this.toSafeJSON();
	}

	/**
	 * Replaces one property from its raw value. Delegates to
	 * {@link Entity.setMany}, inheriting its atomicity and its `updatedAt`
	 * stamping rules.
	 *
	 * `protected`: only the entity's own business methods may mutate it.
	 * External code — a repository, a `Command`, another entity — calls a
	 * business method instead, never this directly.
	 *
	 * @param key - A blueprint key.
	 * @param value - The property's raw input value.
	 * @returns `true` when the value actually differed from the current one and
	 *   the entity changed, `false` when it matched and nothing was stamped.
	 *
	 * @throws `ImmutablePropertyException` — when the key is an identity field.
	 * @throws `InvalidPropertyException` — when the key is outside the
	 *   blueprint or the value fails validation.
	 */
	protected set<Key extends keyof PropertiesShape>(
		key: Key,
		value: InputValueOf<PropertiesShape[Key]>,
	): boolean {
		return this.setMany({ [key]: value } as unknown as Partial<
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
	 * Returns whether anything actually changed — the same signal that decides
	 * the `updatedAt` stamp, handed to the caller rather than left to be
	 * re-derived. `onUpdate` (`./decorators`) reads exactly this: inferring it
	 * from `updatedAt` instead would miss two real mutations landing in the
	 * same millisecond, since that stamp is an ISO string.
	 *
	 * `protected`, same as {@link Entity.set} — the mutation primitive itself
	 * is off-limits to external code, not just its one-key wrapper.
	 *
	 * Every key carrying an {@link Entity.onSet} handler runs it first, on the
	 * still-raw value: before the build phase, so a handler that throws leaves
	 * the entity untouched.
	 *
	 * @param values - A partial map of blueprint keys to raw input values.
	 * @returns `true` when at least one value differed from the current one and
	 *   `updatedAt` was stamped, `false` when every value matched (including
	 *   the empty `setMany({})`).
	 *
	 * @throws `ImmutablePropertyException` — when a key is an identity field
	 *   (`id`/`createdAt`/`updatedAt`); they are readable, never writable.
	 * @throws `InvalidPropertyException` — when a key is outside the blueprint
	 *   or a value fails validation.
	 * @throws `InvalidEntityDefinitionException` — when `onSet` is a class field.
	 */
	protected setMany(values: Partial<InputValuesOf<PropertiesShape>>): boolean {
		const entries = Object.entries(values);

		for (const [key] of entries) {
			if (RAW_ENTITY_KEYS.has(key))
				throw new ImmutablePropertyException(key, this[Source]);

			if (!Object.hasOwn(this[Properties], key))
				throw new InvalidPropertyException(key, this[Source]);
		}

		const domain = this[Context] as Record<
			string,
			AnyValueObject | AnyEntity | AnyRecord | AnyWrapper
		>;

		const handlers = readSetHandlers(this, "Entity");

		// Before the build phase, so a throwing handler leaves the entity
		// untouched — the same atomicity the build/assign split already gives.
		// The snapshot is only assembled when a handler is actually going to
		// run, keeping the handler-less path free of the extra pass.
		if (entries.some(([key]) => handlers[key] !== undefined)) {
			const raw: Record<string, unknown> = {};

			for (const key of Object.keys(this[Properties]))
				raw[key] = domain[key] === undefined ? undefined : rawOf(domain[key]);

			for (const [key, value] of entries) raw[key] = value;

			for (const [key, value] of entries)
				if (value !== undefined) handlers[key]?.(value as never, raw as never);
		}

		const built = entries.map(
			([key, value]) =>
				[
					key,
					buildProperty(this[Properties], this[Source], key, value, false),
				] as const,
		);

		let changed = false;

		for (const [key, next] of built) {
			if (deepEquals(rawOf(domain[key]), rawOf(next))) continue;

			domain[key] = next;
			changed = true;
		}

		if (!changed) return false;

		this[Context].updatedAt = DateTimeVO.now({
			name: "updatedAt",
			source: this[Source],
		});

		return true;
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

		// The wrapper test comes first: a wrapper is a container, so it would
		// otherwise fall through as "not a value-object" and be handed back as
		// the container itself instead of its contents.
		if (isWrapper(property))
			return property.unwrap() as ReadValueOf<PropertiesShape, Key>;

		return (isValueObject(property) ? property.value : property) as ReadValueOf<
			PropertiesShape,
			Key
		>;
	}

	/**
	 * Whether a key was **declared** sensitive — by its value-object's
	 * `sensitive: true`, or by this entity's own `defineEntity`.
	 *
	 * It reports the declaration and nothing else: it never looks at the stored
	 * value, and a key answering `true` is still readable through
	 * {@link Entity.get} and still round-trips through `toJSON`. What the flag
	 * changes is where the value is *allowed to surface* — `toString()`,
	 * `toSafeJSON()` and Node's inspect output replace it, while `toJSON()`
	 * stays lossless because it is the persistence contract.
	 *
	 * **The two declaration sources are not interchangeable further down.** Both
	 * redact, and both answer `true` here. Only the value-object one also
	 * suppresses the key's `findBy`/`findManyBy` methods in a derived
	 * `RepositoryOf`: the per-aggregate `sensitive: [...]` list is a value the
	 * class type never sees, so the type level cannot act on it.
	 *
	 * Unlike {@link Entity.isUnique}, the identity fields are **not** seeded:
	 * `id`, `createdAt` and `updatedAt` all return `false`, because an
	 * identifier is not a secret — it is what a log needs in order to be useful.
	 *
	 * @param key - A blueprint key or identity field.
	 * @returns `true` when the key was declared sensitive.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside
	 *   `blueprint ∪ id/createdAt/updatedAt`. Answering `false` to a mistyped
	 *   name would turn a typo into a silent "not a secret", the same failure
	 *   mode {@link Entity.get}'s identical guard exists to prevent.
	 *
	 * @example
	 * ```ts
	 * class User extends entityOf(userProperties, "user", { sensitive: ["token"] }) {}
	 *
	 * const user = new User({ email: "alan@roastery.dev", password: "S3cret!x", token: "t" });
	 *
	 * user.isSensitive("password"); // true — PasswordVO declared it
	 * user.isSensitive("token");    // true — the definition named it
	 * user.isSensitive("email");    // false
	 * user.isSensitive("id");       // false — identity is not a secret
	 * ```
	 *
	 * @see {@link Entity.isUnique} — the same shape for the uniqueness declaration.
	 * @see {@link Entity.toSafeJSON} — what acts on the answer.
	 */
	public isSensitive<Key extends ReadableKey<PropertiesShape>>(
		key: Key,
	): boolean {
		const name = String(key);

		if (!RAW_ENTITY_KEYS.has(name) && !Object.hasOwn(this[Properties], name))
			throw new InvalidPropertyException(name, this[Source]);

		return this.#sensitive.has(name);
	}

	/**
	 * Whether a key was **declared** unique — by its value-object's
	 * `unique: true`, by this entity's own `defineEntity`, or by being `id`.
	 *
	 * **It never touches storage, and it cannot.** Uniqueness is a property of
	 * the *set* of rows; an instance sees one aggregate and has no way to know
	 * what else was written. So this answers "is this field supposed to be
	 * unique?", not "is this value already taken?" — the second question
	 * belongs to whoever implements the repository port, which is where the
	 * declaration is meant to be read and enforced. Two entities carrying the
	 * same value in a unique field construct perfectly happily.
	 *
	 * `id` always returns `true`: identity is the primary key, unique by
	 * construction in every entity. `createdAt`/`updatedAt` return `false` —
	 * two rows may be written in the same millisecond.
	 *
	 * @param key - A blueprint key or identity field.
	 * @returns `true` when the key was declared unique.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside
	 *   `blueprint ∪ id/createdAt/updatedAt`. A predicate answering `false` to a
	 *   mistyped name would turn a typo into a silent "not unique", which is the
	 *   failure mode {@link Entity.get}'s identical guard exists to prevent.
	 *
	 * @example
	 * ```ts
	 * class User extends entityOf(userProperties, "user", { unique: ["handle"] }) {}
	 *
	 * const user = new User({ email: "alan@roastery.dev", handle: "alan", name: "Alan" });
	 *
	 * user.isUnique("id");     // true — always
	 * user.isUnique("email");  // true — EmailVO declared it
	 * user.isUnique("handle"); // true — the definition named it
	 * user.isUnique("name");   // false
	 * ```
	 *
	 * @see `uniqueKeysOf` in `./helpers` — the same declaration, read off the
	 *   class, for an adapter that has no instance yet.
	 */
	public isUnique<Key extends ReadableKey<PropertiesShape>>(key: Key): boolean {
		const name = String(key);

		if (!RAW_ENTITY_KEYS.has(name) && !Object.hasOwn(this[Properties], name))
			throw new InvalidPropertyException(name, this[Source]);

		return this.#unique.has(name);
	}

	/**
	 * Records a domain event, filling in the parts every event shares: the
	 * raising entity's own `id` and the instant it was raised. The subclass
	 * supplies only `name` and whatever payload the event carries — never
	 * `occurredAt`/`aggregateId`, which the base always stamps itself so an
	 * event can never misreport which entity (or when) it came from. `beans`
	 * is not event-sourced, so there is no replay path that would need to
	 * override either field.
	 *
	 * Accepts either a built event (an object literal or a `DomainEvent`
	 * instance) or a bare class reference — a `DomainEvent` subclass whose
	 * constructor takes only `aggregateId`, i.e. one that adds no payload of
	 * its own. In that case the base instantiates it itself, passing
	 * `this.id`, so a payload-less event needs no `new` at the call site:
	 * `this.raiseEvent(OrderConfirmed)`. A subclass whose constructor needs
	 * more than `aggregateId` does not satisfy the class-reference overload
	 * — TypeScript routes it to the "already built" branch instead, so it
	 * still has to be constructed explicitly with its extra payload.
	 *
	 * Never called automatically: `set`/`setMany` do not raise events on
	 * their own. A subclass calls this from its own business methods, at the
	 * point a change becomes domain-meaningful. Prefer raising from the
	 * aggregate root — an event raised inside a nested entity (`post.get(
	 * "author").someMethod()`) lands in that nested entity's own buffer, so a
	 * plain `pullDomainEvents()` on the root will not see it. Reach for
	 * `pullDomainEvents({ deep: true })` when the aggregate genuinely raises
	 * from more than one level.
	 *
	 * @typeParam Event - The event, inferred either from the object passed or
	 *   from the instance type of the class reference passed, so any payload
	 *   beyond `name` survives without an excess-property error.
	 * @param event - The event, minus `occurredAt`/`aggregateId` — or a class
	 *   reference to build one from, with `this.id` as its only argument.
	 */
	protected raiseEvent<
		Event extends Omit<IDomainEvent, "occurredAt" | "aggregateId">,
	>(event: Event | (new (aggregateId: string) => Event)): void {
		const built = typeof event === "function" ? new event(this.id) : event;

		this[Events].push({
			...built,
			occurredAt: DateTimeVO.now({ name: "occurredAt", source: this[Source] })
				.value,
			aggregateId: this.id,
		});
	}

	/**
	 * Drains the buffered domain events: returns everything raised since the
	 * last pull (or since construction), oldest first, and empties the
	 * buffer. Starts empty on every construction path (`new`, `fromJSON`,
	 * `demo`) — there is no source instance to carry events over from.
	 *
	 * By default it drains **only this entity's own buffer**: an event raised
	 * inside a nested entity stays there, since a nested entity is a
	 * participant in the aggregate rather than a second root. Pass
	 * `{ deep: true }` to drain the whole aggregate — this buffer first, then
	 * each nested entity's, recursively, in blueprint order. That is the form
	 * to reach for whenever the blueprint holds an entity carrying lifecycle
	 * decorators (`./decorators`): a decorated nested entity raises on its own
	 * construction, and a shallow pull from the root would leave that event
	 * sitting in a buffer nobody ever reads.
	 *
	 * @param options - `deep` drains nested entities too; omitted or `false`
	 *   keeps the historical, root-only behaviour.
	 * @returns The events raised since the last pull, root's own first.
	 *
	 * @example
	 * ```ts
	 * post.pullDomainEvents();               // only what Post itself raised
	 * post.pullDomainEvents({ deep: true }); // Post + nested Author
	 * ```
	 *
	 * @see `collectDomainEvents` in `@roastery/beans/application/command/helpers`
	 *   — the application-layer collector, which always pulls deep.
	 */
	public pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[] {
		const own = this[Events].splice(0);

		if (options?.deep !== true) return own;

		const nested = Object.values(
			this[Context] as Record<
				string,
				AnyValueObject | AnyEntity | AnyRecord | AnyWrapper | undefined
			>,
		).flatMap((property) =>
			property !== undefined && !isValueObject(property)
				? (property as AnyEntity | AnyRecord | AnyWrapper).pullDomainEvents({
						deep: true,
					})
				: [],
		);

		return [...own, ...nested];
	}

	/** Whether {@link Entity.destroy} has already been called on this instance. */
	public get isDestroyed(): boolean {
		return this.#destroyed;
	}

	/**
	 * Marks the entity destroyed and releases its transient `[Storage]`. A
	 * lightweight marker, not a hard guard: `get`/`set`/`toJSON`/etc. keep
	 * working afterwards — there is no way to force garbage collection from
	 * inside the entity itself, so "removed from memory" here means "the
	 * transient cache is released and the fact is recorded," not "this
	 * instance is now unusable." Idempotent — a second call is a no-op, which
	 * is what lets `onDelete` (`domain/entity/decorators`) tell a real
	 * destruction from a repeated one without inspecting anything beyond
	 * {@link Entity.isDestroyed} itself.
	 */
	public destroy(): void {
		if (this.#destroyed) return;

		this.#destroyed = true;
		this[Storage].clear();
	}
}

/**
 * A **concrete** `Entity` subclass that reads its definition from a static on
 * the class it is constructed as, rather than from an overridden method.
 *
 * This exists so `entityOf` has something non-abstract to hand back. A type
 * alias describing `Entity<Shape>` still carries `defineEntity` as *abstract*,
 * and TypeScript then rejects every `class X extends entityOf(…) {}` with
 * **TS2515** — the subclass is non-abstract but inherits an unimplemented
 * abstract member, and there is no way to say "already implemented" from a
 * type literal. Descending from a concrete class removes the abstract member
 * outright, while keeping a real class type in the intersection, which is what
 * lets a subclass still reach `raiseEvent`, `[Storage]` and `[Events]`.
 *
 * The definition lives on `constructor.definition` rather than in a closure so
 * that `defineEntity` stays **pure and prototype-borne**: `fromJSON` reads it
 * off a probe built with `Object.create(this.prototype)`, whose `constructor`
 * still resolves to the generated class.
 *
 * Not exported from any barrel — `entityOf` is the only way to produce one.
 *
 * @typeParam PropertiesShape - The blueprint shape.
 *
 * @see `entityOf` in `./helpers/entity-of` — the only producer.
 */
export class BoundEntity<
	const PropertiesShape extends PropertiesShapeBase,
> extends Entity<PropertiesShape> {
	/**
	 * Reads the definition the factory stamped onto the generated class.
	 *
	 * @returns The blueprint and entity-type name bound at factory call time.
	 *
	 * @throws `InvalidEntityDefinitionException` — when the class was produced
	 *   some other way and carries no definition.
	 */
	protected defineEntity(): EntityDefinition<PropertiesShape> {
		const { definition } = this.constructor as {
			definition?: EntityDefinition<PropertiesShape>;
		};

		if (!definition)
			throw new InvalidEntityDefinitionException(
				"entity",
				"Entity: this class descends from the blueprint-bound base but carries no definition. Build it with entityOf(properties, source), or extend Entity directly and implement defineEntity.",
			);

		return definition;
	}
}
