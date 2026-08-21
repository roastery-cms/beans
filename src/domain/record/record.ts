/**
 * The blueprint-driven `DomainRecord` base class.
 *
 * Unlike `entity.ts`, this module carries almost no construction machinery of
 * its own: `buildContext`, `modelFor` and the definition readers all live in
 * `./helpers/` as ordinary internal modules. That is possible because every
 * property discriminant in this pillar is **structural** (`isValueObjectClass`,
 * `isEntityClass`, `isRecordClass` in `@/shared/helpers`), so nothing in the
 * construction path ever needs to import a class — which in turn is what lets
 * the entity pillar reach `./helpers/model-for` without dragging a class
 * module across the boundary. Keep it that way: `BoundRecord extends
 * DomainRecord` lives here precisely because a `class X extends Y` must be
 * evaluated after `Y` exists, and putting one inside the cross-pillar import
 * cycle would resurrect `ReferenceError: … before initialization`.
 */

import type { IDomainEvent } from "@/domain/domain-event/types";
import { RAW_ENTITY_KEYS } from "@/domain/entity/helpers/raw-entity-keys";
import { deepEquals } from "@/domain/entity/helpers/deep-equals";
import { installAccessors } from "@/shared/helpers/install-accessors";
import { isValueObject } from "@/shared/helpers/is-value-object";
import { isWrapper } from "@/shared/helpers/is-wrapper";
import { rawOf } from "@/shared/helpers/raw-of";
import { readSetHandlers } from "@/shared/helpers/read-set-handlers";
import { redactIfSensitive } from "@/shared/redaction/redact-if-sensitive";
import { resolveSensitiveKeys } from "@/shared/redaction/resolve-sensitive-keys";
import type { ISensitiveKey } from "@/shared/redaction/sensitive-keys-of";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { Context, Demo, Properties, Source } from "@roastery/terroir/symbols";
import { buildContext, buildProperty } from "./helpers/build-context";
import { modelFor } from "./helpers/model-for";
import { readBoundDefinition } from "./helpers/read-bound-definition";
import { readDefinition } from "./helpers/read-definition";
import type {
	IRecord,
	RawRecordContextOf,
	RecordDefinition,
	RecordPropertiesShapeBase,
	SerializedRecord,
} from "./types";
import type { RecordContextOf } from "./types/record-context-of.type";
import type { RecordDomainKeys } from "./types/record-domain-keys.type";
import type { RecordSetHandlersOf } from "./types/record-set-handlers-of.type";
import type { RecordInputValuesOf } from "./types/record-input-values-of.type";
import type { RecordPropertiesOfClass } from "./types/record-properties-of-class.type";
import type { RecordReadValueOf } from "./types/record-read-value-of.type";
import type { RecordSchemaOf } from "./types/record-schema-of.type";

/**
 * Abstract base class every domain record extends, driven by a **blueprint**:
 * a plain object mapping each domain property to its `ValueObject`, `Entity`
 * or `DomainRecord` class. The subclass declares only `defineRecord()` and
 * whatever domain verbs it wants; construction, validation, serialization,
 * mutation and the derived accessors all come from here.
 *
 * **A record is an entity minus identity.** It has no `id`, no `createdAt`,
 * no `updatedAt`, and is never a row: it exists to give a *composite* domain
 * value real behaviour — `Money`, `Address`, `DateRange` — instead of flattening
 * it into a `customObjectVO` that validates its shape and can do nothing else.
 * Everything else an entity offers, it offers: a schema derived from the
 * blueprint, strict hydration, demo fixtures, blueprint rules, redaction, and
 * mutation through `set`/`setMany`.
 *
 * `set`/`setMany` are `protected`, exactly as on `Entity`. Nothing outside the
 * class may mutate a record — only the verbs the subclass names, which is what
 * keeps the ubiquitous language in the type rather than in a convention.
 *
 * **It does not raise domain events.** There is no `[Events]` slot and no
 * `raiseEvent`: an event belongs to an aggregate root, and a record has no
 * identity to report as its `aggregateId`. It does implement
 * {@link DomainRecord.pullDomainEvents}, but purely as a *forwarder* — a
 * record's blueprint may hold entities, and without the forward their buffers
 * would be stranded behind it during a deep drain.
 *
 * **It has no `[Storage]` and no `destroy()`.** Both exist for something with
 * a lifecycle of its own; a record's lifecycle is its owner's.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @example
 * ```ts
 * const moneyProperties = { amount: IntegerVO, currency: CurrencyVO };
 *
 * // biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
 * interface Money extends RecordAccessorsOf<typeof moneyProperties> {}
 * class Money extends DomainRecord<typeof moneyProperties> {
 *   protected defineRecord(): RecordDefinition<typeof moneyProperties> {
 *     return { properties: moneyProperties, source: "money" };
 *   }
 *
 *   public add(cents: number): void {
 *     this.set("amount", this.amount + cents);
 *   }
 * }
 * ```
 *
 * @see `recordOf` in `./helpers/record-of` — the factory form, which removes
 *   both the `defineRecord` and the interface merge.
 * @see `Entity` in `@/domain/entity` — the identified counterpart.
 */
export abstract class DomainRecord<
	const PropertiesShape extends RecordPropertiesShapeBase,
> implements IRecord<PropertiesShape>
{
	/** The blueprint, as returned by `defineRecord()`. */
	public readonly [Properties]: PropertiesShape;

	/** The built property map: one instance per blueprint key. */
	public readonly [Context]: RecordContextOf<PropertiesShape>;

	/** Stable record-type identifier, used as the `source` of every exception. */
	public readonly [Source]: string;

	/**
	 * Which keys redact, and with what — resolved once per instance from the
	 * value-objects' own `sensitive` plus the definition's list.
	 *
	 * A true JS private field rather than a terroir symbol slot: nothing
	 * outside the class reads it, so it needs no shared declaration site.
	 */
	readonly #sensitive: ReadonlyMap<string, ISensitiveKey>;

	/**
	 * Declares the blueprint and the record-type name.
	 *
	 * **Must be a prototype method, never a class field.** The base calls it
	 * *inside* its constructor, and a class-field initializer only runs after
	 * `super()` returns. It must also be **pure**: `fromJSON` invokes it on an
	 * `Object.create`d probe with no constructor run.
	 *
	 * @returns The blueprint and the record-type name.
	 */
	protected abstract defineRecord(): RecordDefinition<PropertiesShape>;

	/**
	 * Builds the record from a raw payload: one input value per blueprint key.
	 * Unknown keys are ignored; each property validates through its own class.
	 *
	 * Also installs the blueprint-derived accessors on the class prototype,
	 * once per class. A subclass may declare its own constructor and delegate
	 * to `super(...)` — it must accept the base's payload in at least one
	 * overload and forward any argument it does not recognise, because
	 * `demo()` passes a module-private sentinel through this same channel.
	 *
	 * @param context - The raw construction payload.
	 *
	 * @throws `InvalidEntityDefinitionException` — when `defineRecord` is a
	 *   class field.
	 * @throws `PropertyNameCollisionException` — when a blueprint key collides
	 *   with an existing member, or names one of `id`/`createdAt`/`updatedAt`.
	 * @throws `CyclicEntityDefinitionException` — when the blueprint references
	 *   itself.
	 * @throws `InvalidPropertyException` — when a value fails validation.
	 */
	public constructor(context: RawRecordContextOf<PropertiesShape>) {
		const { properties, sensitive, source } =
			readDefinition<PropertiesShape>(this);

		const useDefault = (context as unknown) === Demo;

		// A record has no identity, and must not be able to fake one: an `id`
		// accessor here would break the `AnyEntity`/`AnyRecord` disjunction the
		// whole blueprint type machinery discriminates on. `installAccessors`
		// cannot catch these — a record has no such members to collide with.
		for (const key of Object.keys(properties))
			if (RAW_ENTITY_KEYS.has(key))
				throw new PropertyNameCollisionException(
					key,
					source,
					`Record: the blueprint property "${key}" is an identity field, which a record does not have. Rename it, or model this as an Entity instead.`,
				);

		installAccessors(
			Object.getPrototypeOf(this) as object,
			properties,
			source,
			"Record",
		);

		this.#sensitive = resolveSensitiveKeys(properties, sensitive);
		this[Source] = source;
		this[Properties] = properties;
		this[Context] = buildContext(
			properties,
			source,
			useDefault ? undefined : (context as unknown as Record<string, unknown>),
			useDefault,
			readSetHandlers(this, "Record"),
		);
	}

	/**
	 * The per-property business rules this record runs **before** a value is
	 * built — on construction (`new`, `fromJSON`, `demo`) and on every
	 * `set`/`setMany`. The base returns an empty map; override it to declare a
	 * handler per blueprint key.
	 *
	 * `Entity.onSet`'s twin, with the identical contract: each handler receives
	 * the raw value about to be set plus the same read-only view of the whole
	 * raw payload a `derive` rule gets, returns `void`, and enforces by
	 * **throwing** rather than by rewriting the value — normalising stays the
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
	 * @see `RecordSetHandlersOf` in `./types/record-set-handlers-of.type` — the
	 *   returned shape.
	 * @see `Entity.onSet` in `@/domain/entity/entity` — the same hook, one
	 *   pillar over.
	 *
	 * @example
	 * ```ts
	 * class Money extends recordOf(moneyProperties, "money") {
	 *   protected override onSet(): RecordSetHandlersOf<typeof moneyProperties> {
	 *     return {
	 *       amount: (value) => {
	 *         if (value < 0) throw new InvalidPropertyException("amount", "money");
	 *       },
	 *     };
	 *   }
	 * }
	 * ```
	 */
	protected onSet(): RecordSetHandlersOf<PropertiesShape> {
		return {};
	}

	/**
	 * Builds the record from its declared defaults, with no payload: each
	 * value-object falls back to its `[Meta].default`, nested entities and
	 * records recurse into their own demo mode, and the blueprint's rules
	 * still resolve — which is what makes a fixture coherent rather than a bag
	 * of unrelated defaults.
	 *
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `InvalidPropertyException` — when a value-object's default does
	 *   not pass its own model.
	 */
	public static demo<
		Self extends {
			readonly prototype: { [Properties]: RecordPropertiesShapeBase };
		},
	>(this: Self): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` is the concrete subclass the call was made on; replacing it with `DomainRecord` would construct the abstract base.
		return Reflect.construct(this as never, [Demo]) as Self["prototype"];
	}

	/**
	 * Hydrates the record from a serialized payload, strictly: the whole
	 * payload is validated against the aggregate schema **before** any
	 * value-object is built, rejecting missing and unknown keys alike.
	 *
	 * Throws `InvalidDomainDataException` — a **domain**-layer exception, like
	 * `Entity.fromJSON` and unlike `Command.fromJSON`'s `BadRequestException`.
	 * A record is domain modeling, not an application boundary.
	 *
	 * @param data - The serialized record, as produced by
	 *   {@link DomainRecord.toJSON}.
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `InvalidDomainDataException` — when the payload does not match
	 *   the aggregate schema.
	 * @throws `CyclicEntityDefinitionException` — when the blueprint references
	 *   itself, directly or indirectly.
	 */
	public static fromJSON<
		Self extends {
			readonly prototype: { [Properties]: RecordPropertiesShapeBase };
		},
	>(
		this: Self,
		data: SerializedRecord<RecordPropertiesOfClass<Self>>,
	): Self["prototype"] {
		// The probe reads the blueprint without running any constructor, so
		// validation happens before any value-object is built.
		// biome-ignore lint/complexity/noThisInStatic: `this` is the concrete subclass the call was made on; replacing it with `DomainRecord` would probe the abstract base.
		const probe = Object.create(this.prototype) as object;

		const { properties, source } =
			readDefinition<RecordPropertiesShapeBase>(probe);

		if (!SchemaManager.match(modelFor(properties, source), data))
			throw new InvalidDomainDataException(source);

		// biome-ignore lint/complexity/noThisInStatic: same as above — constructing `DomainRecord` would yield an instance of the abstract base, not the subclass.
		return Reflect.construct(this as never, [data]) as Self["prototype"];
	}

	/**
	 * The aggregate TypeBox schema, derived from the blueprint and memoized
	 * per blueprint object — every instance of a class shares one compiled
	 * schema. Every level carries `additionalProperties: false`, and no level
	 * of a record carries identity fields.
	 */
	public get schema(): RecordSchemaOf<PropertiesShape> {
		return modelFor(
			this[Properties],
			this[Source],
		) as unknown as RecordSchemaOf<PropertiesShape>;
	}

	/**
	 * Serializes the record to a plain object: one raw value per blueprint
	 * key, recursing into nested entities and records.
	 *
	 * **Never redacts**, exactly like `Entity.toJSON` and unlike
	 * `Command.toJSON`: this is the persistence contract, and it has to
	 * round-trip through {@link DomainRecord.fromJSON}. Reach for
	 * {@link DomainRecord.toSafeJSON} when the target is a log.
	 *
	 * @returns The serialized record.
	 */
	public toJSON(): SerializedRecord<PropertiesShape> {
		return Object.fromEntries(
			Object.entries(this[Context] as Record<string, unknown>)
				.filter(([, property]) => property !== undefined)
				.map(([key, property]) => [key, rawOf(property)]),
		) as SerializedRecord<PropertiesShape>;
	}

	/**
	 * The same object {@link DomainRecord.toJSON} produces, with every key
	 * marked sensitive replaced — the form to hand a logger, an error report
	 * or any other place the data is *displayed* rather than stored.
	 *
	 * Recurses into nested entities and records, each applying its own
	 * declared sensitive keys, so an aggregate is safe all the way down.
	 *
	 * **The result does not round-trip through `fromJSON`** when anything was
	 * redacted — the whole point of keeping it separate from `toJSON`.
	 *
	 * @returns The serialized record, sensitive keys replaced.
	 *
	 * @see {@link DomainRecord.toJSON} — the lossless counterpart.
	 */
	public toSafeJSON(): SerializedRecord<PropertiesShape> {
		return Object.fromEntries(
			Object.entries(this[Context] as Record<string, unknown>)
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
						: (property as { toSafeJSON(): unknown }).toSafeJSON(),
				]),
		) as SerializedRecord<PropertiesShape>;
	}

	/** @returns The serialized record as a JSON string, sensitive keys replaced. */
	public toString(): string {
		return JSON.stringify(this.toSafeJSON());
	}

	/**
	 * Node's inspect hook, so `console.log(record)` shows the redacted view
	 * rather than the raw `[Context]` instances. `toJSON` is deliberately not
	 * routed through here — persisting must still see the real values.
	 *
	 * @returns The redacted serialized record.
	 */
	public [Symbol.for(
		"nodejs.util.inspect.custom",
	)](): SerializedRecord<PropertiesShape> {
		return this.toSafeJSON();
	}

	/**
	 * Replaces one property from its raw value. Delegates to
	 * {@link DomainRecord.setMany}, inheriting its atomicity.
	 *
	 * `protected`: only the record's own domain verbs may mutate it.
	 *
	 * @param key - A blueprint key.
	 * @param value - The property's raw input value.
	 * @returns `true` when the value actually differed from the current one,
	 *   `false` when it matched and nothing changed.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside the
	 *   blueprint or the value fails validation.
	 */
	protected set<Key extends keyof PropertiesShape>(
		key: Key,
		value: RecordInputValuesOf<PropertiesShape>[Key &
			RecordDomainKeys<PropertiesShape>],
	): boolean {
		return this.setMany({
			[key]: value,
		} as unknown as Partial<RecordInputValuesOf<PropertiesShape>>);
	}

	/**
	 * Replaces several properties at once, atomically: every key is validated,
	 * then every value is built, and only then is anything assigned — so a
	 * rejected value leaves the record untouched.
	 *
	 * The entity counterpart also rejects the three identity keys with
	 * `ImmutablePropertyException` and stamps `updatedAt` on the way out.
	 * Neither applies here: a record has no identity field to protect, and no
	 * `updatedAt` to stamp. **That makes the returned `boolean` the only
	 * signal that anything changed** — there is no timestamp to compare
	 * before and after, so a caller (or a decorator, were one to apply) has
	 * nothing else to read.
	 *
	 * Rules never re-fire: mutation takes explicit values, so a derived
	 * sibling keeps whatever construction gave it.
	 *
	 * @param values - A partial map of blueprint keys to raw input values.
	 * @returns `true` when at least one property actually changed.
	 *
	 * @throws `InvalidPropertyException` — when a key is outside the blueprint
	 *   or a value fails validation.
	 * @throws `InvalidEntityDefinitionException` — when `onSet` is a class field.
	 */
	protected setMany(
		values: Partial<RecordInputValuesOf<PropertiesShape>>,
	): boolean {
		const entries = Object.entries(values);

		for (const [key] of entries)
			if (!Object.hasOwn(this[Properties], key))
				throw new InvalidPropertyException(key, this[Source]);

		const domain = this[Context] as Record<string, unknown>;

		const handlers = readSetHandlers(this, "Record");

		// Before the build phase, so a throwing handler leaves the record
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

		return changed;
	}

	/**
	 * Reads one key: the nested **instance** for an entity- or record-valued
	 * property (so reads chain into their verbs), the wrapped raw value for a
	 * value-object property.
	 *
	 * @param key - A blueprint key.
	 * @returns The value for the key.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside the blueprint.
	 */
	public get<Key extends RecordDomainKeys<PropertiesShape>>(
		key: Key,
	): RecordReadValueOf<PropertiesShape, Key> {
		const name = String(key);

		if (!Object.hasOwn(this[Properties], name))
			throw new InvalidPropertyException(name, this[Source]);

		const property = (this[Context] as Record<string, unknown>)[name];

		if (property === undefined)
			return undefined as RecordReadValueOf<PropertiesShape, Key>;

		// First, for the reason `Entity.get`'s own branch states: a wrapper is
		// a container, and would otherwise be handed back instead of unwrapped.
		if (isWrapper(property))
			return property.unwrap() as RecordReadValueOf<PropertiesShape, Key>;

		return (
			isValueObject(property) ? property.value : property
		) as RecordReadValueOf<PropertiesShape, Key>;
	}

	/**
	 * Whether a key was **declared** sensitive — by its value-object's
	 * `sensitive: true`, or by this record's own `defineRecord`.
	 *
	 * Reports the declaration and nothing else: a key answering `true` is
	 * still readable through {@link DomainRecord.get} and still round-trips
	 * through `toJSON`. What the flag changes is where the value is allowed to
	 * surface.
	 *
	 * @param key - A blueprint key.
	 * @returns `true` when the key was declared sensitive.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside the blueprint.
	 */
	public isSensitive<Key extends RecordDomainKeys<PropertiesShape>>(
		key: Key,
	): boolean {
		const name = String(key);

		if (!Object.hasOwn(this[Properties], name))
			throw new InvalidPropertyException(name, this[Source]);

		return this.#sensitive.has(name);
	}

	/**
	 * Forwards a **deep** domain-event drain to the entities this record
	 * nests, concatenating in blueprint order.
	 *
	 * A record has no buffer of its own and never raises, so the shallow form
	 * — the default — always returns `[]`. The deep form exists because a
	 * record's blueprint may hold an entity: without the forward, an entity
	 * nested behind a record would keep its events forever, which is exactly
	 * the kind of silent loss the rest of the package avoids.
	 *
	 * @param options - `deep: true` walks into nested entities and records.
	 * @returns The drained events, or `[]`.
	 *
	 * @see `Entity.pullDomainEvents` in `@/domain/entity` — where the events
	 *   are actually buffered.
	 */
	public pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[] {
		if (options?.deep !== true) return [];

		return Object.values(this[Context] as Record<string, unknown>).flatMap(
			(property) =>
				property !== undefined && !isValueObject(property)
					? (
							property as {
								pullDomainEvents(options?: {
									readonly deep?: boolean;
								}): readonly IDomainEvent[];
							}
						).pullDomainEvents({ deep: true })
					: [],
		);
	}
}

/**
 * The concrete base `recordOf` generates its classes from: a `DomainRecord`
 * whose `defineRecord()` reads the definition its factory stamped onto the
 * generated class as a static.
 *
 * Lives in this module, not a sibling one, for the reason the module TSDoc
 * gives: `extends DomainRecord` is evaluated at module load, so a separate
 * file would risk `ReferenceError: Cannot access 'DomainRecord' before
 * initialization` on some import orders — the exact failure `BoundEntity`
 * already ran into.
 *
 * Not exported from any barrel: it is an implementation detail of `recordOf`,
 * reachable only through the type `RecordClassOf` names.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 */
export class BoundRecord<
	const PropertiesShape extends RecordPropertiesShapeBase,
> extends DomainRecord<PropertiesShape> {
	/**
	 * Reads the factory-stamped static instead of closing over the definition,
	 * so `defineRecord` stays a pure prototype method the `Object.create`
	 * probes can call.
	 *
	 * @returns The blueprint and record-type name bound at factory call time.
	 *
	 * @throws `InvalidEntityDefinitionException` — when the class carries no
	 *   stamped definition.
	 */
	protected defineRecord(): RecordDefinition<PropertiesShape> {
		return readBoundDefinition<PropertiesShape>(this);
	}
}
