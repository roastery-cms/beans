import { DateTimeDTO, UuidDTO } from "@/collections/dtos";
import { DateTimeVO, UuidVO } from "@/collections/value-objects/new";
import { metaOf, type ValueObject } from "@/value-object/new";
import type { IValueObjectContext } from "@/value-object/types";
import { t } from "@roastery/terroir";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import { Schema } from "@roastery/terroir/schema";
import type { EntityDTO } from "./dtos";
import { EntityStorage } from "./entity-storage";
import { makeEntity } from "./factories";
import { deepEquals } from "./helpers";
import type { IRawEntity } from "./types";

const Properties = Symbol("properties");
const Context = Symbol("context");
const Source = Symbol("source");
const Storage = Symbol("storage");

const Demo = Symbol("demo");

const RAW_ENTITY_KEYS: ReadonlySet<PropertyKey> = new Set<PropertyKey>([
	"id",
	"createdAt",
	"updatedAt",
]);

type AnyValueObject = ValueObject<unknown, t.TSchema>;

type AnyValueObjectClass = {
	readonly prototype: AnyValueObject;
	new (value: never, context: IValueObjectContext): AnyValueObject;
};

type AnyEntity = {
	toJSON(): object;
	readonly schema: t.TSchema;
};

type AnyEntityClass = {
	readonly prototype: AnyEntity;
	new (context: never): AnyEntity;
};

type AnyPropertyClass = AnyValueObjectClass | AnyEntityClass;

type PropertiesShapeBase = Record<string, AnyPropertyClass>;

type PropertiesOfInstance<Instance> = Instance extends {
	[Properties]: infer Shape;
}
	? Shape extends PropertiesShapeBase
		? Shape
		: never
	: never;

type PropertiesOfClass<Class> = Class extends {
	readonly prototype: infer Instance;
}
	? PropertiesOfInstance<Instance>
	: never;

type RawValueOf<Class extends AnyPropertyClass> = Class extends AnyEntityClass
	? ReturnType<Class["prototype"]["toJSON"]>
	: Class extends AnyValueObjectClass
		? Class["prototype"]["value"]
		: never;

type InputValueOf<Class extends AnyPropertyClass> = Class extends AnyEntityClass
	? Omit<ReturnType<Class["prototype"]["toJSON"]>, keyof IRawEntity> &
			IdentityInput
	: Class extends AnyValueObjectClass
		? Class["prototype"]["value"]
		: never;

type BaseContext = {
	id: UuidVO;
	createdAt: DateTimeVO;
	updatedAt?: DateTimeVO;
};

type ContextOf<PropertiesShape extends PropertiesShapeBase> = BaseContext & {
	[Key in keyof PropertiesShape]: PropertiesShape[Key]["prototype"];
};

type InputValuesOf<PropertiesShape extends PropertiesShapeBase> = {
	[Key in keyof PropertiesShape]: InputValueOf<PropertiesShape[Key]>;
};

type SerializedValuesOf<PropertiesShape extends PropertiesShapeBase> = {
	[Key in keyof PropertiesShape]: RawValueOf<PropertiesShape[Key]>;
};

type IdentityInput =
	| { id?: never; createdAt?: never; updatedAt?: never }
	| IRawEntity;

type RawContextOf<PropertiesShape extends PropertiesShapeBase> =
	InputValuesOf<PropertiesShape> & IdentityInput;

type SerializedEntity<PropertiesShape extends PropertiesShapeBase> =
	IRawEntity & SerializedValuesOf<PropertiesShape>;

type SchemaOf<Class extends AnyPropertyClass> = Class extends AnyEntityClass
	? Class["prototype"]["schema"]
	: Class["prototype"] extends ValueObject<unknown, infer SchemaType>
		? SchemaType
		: never;

type EntitySchemaOf<PropertiesShape extends PropertiesShapeBase> = t.TObject<
	{
		id: typeof UuidDTO;
		createdAt: typeof DateTimeDTO;
		updatedAt: t.TOptional<typeof DateTimeDTO>;
	} & {
		[Key in keyof PropertiesShape]: SchemaOf<PropertiesShape[Key]>;
	}
>;

type ReadableKey<PropertiesShape> = keyof PropertiesShape | keyof IRawEntity;

type AccessorsOf<PropertiesShape extends PropertiesShapeBase> = {
	readonly [Key in keyof PropertiesShape]: ReadValueOf<PropertiesShape, Key>;
};

type ReadValueOf<
	PropertiesShape extends PropertiesShapeBase,
	Key extends ReadableKey<PropertiesShape>,
> = Key extends keyof IRawEntity
	? IRawEntity[Key]
	: Key extends keyof PropertiesShape
		? PropertiesShape[Key] extends AnyEntityClass
			? PropertiesShape[Key]["prototype"]
			: RawValueOf<PropertiesShape[Key]>
		: never;

type EntityDefinition<PropertiesShape extends PropertiesShapeBase> = {
	properties: PropertiesShape;
	source: string;
};

type ModelEntry = {
	model: t.TObject;
	validator: Schema<t.TObject>;
};

const models = new WeakMap<PropertiesShapeBase, ModelEntry>();

const deriving = new Set<PropertiesShapeBase>();
const constructing = new Set<PropertiesShapeBase>();

const accessors = new WeakMap<object, ReadonlySet<string>>();

function inheritedAccessorKeys(prototype: object): Set<string> {
	const inherited = new Set<string>();

	for (
		let current: object | null = prototype;
		current !== null;
		current = Object.getPrototypeOf(current) as object | null
	)
		for (const key of accessors.get(current) ?? []) inherited.add(key);

	return inherited;
}

function installAccessors(
	prototype: object,
	properties: PropertiesShapeBase,
	source: string,
): void {
	if (accessors.has(prototype)) return;

	const keys = Object.keys(properties);
	const inherited = inheritedAccessorKeys(prototype);
	const missing = keys.filter((key) => !inherited.has(key));

	for (const key of missing)
		if (key in prototype)
			throw new OperationFailedException(
				source,
				`BetterEntity: a propriedade "${key}" do blueprint colide com um membro já existente da entidade e não pode virar accessor. Renomeie-a.`,
			);

	for (const key of missing)
		Object.defineProperty(prototype, key, {
			configurable: true,
			enumerable: false,
			get(this: { get(name: string): unknown }): unknown {
				return this.get(key);
			},
		});

	accessors.set(prototype, new Set(keys));
}

function isEntityClass(
	candidate: AnyPropertyClass,
): candidate is AnyEntityClass {
	return (
		typeof candidate === "function" &&
		candidate.prototype instanceof BetterEntity
	);
}

function isEntity(candidate: unknown): candidate is AnyEntity {
	return candidate instanceof BetterEntity;
}

function readDefinition<PropertiesShape extends PropertiesShapeBase>(
	entity: object,
): EntityDefinition<PropertiesShape> {
	const define = (
		entity as { defineEntity?: () => EntityDefinition<PropertiesShape> }
	).defineEntity;

	if (typeof define !== "function")
		throw new OperationFailedException(
			"entity",
			"BetterEntity: defineEntity precisa ser um método de protótipo. Declarado como class field, seu initializer só roda depois do super(), e a base o invoca durante a construção.",
		);

	return define.call(entity);
}

function definitionOf(
	entityClass: AnyEntityClass,
): EntityDefinition<PropertiesShapeBase> {
	return readDefinition<PropertiesShapeBase>(
		Object.create(entityClass.prototype) as object,
	);
}

function modelOfValueObject(valueObjectClass: AnyValueObjectClass): t.TSchema {
	return metaOf(valueObjectClass).model.toJSON() as t.TSchema;
}

function cycleError(source: string): OperationFailedException {
	return new OperationFailedException(
		source,
		`BetterEntity: o blueprint de "${source}" referencia a si mesmo, direta ou indiretamente. Não há detecção de ciclo além desta — quebre o ciclo antes de modelar.`,
	);
}

function modelFor(properties: PropertiesShapeBase, source: string): ModelEntry {
	const cached = models.get(properties);

	if (cached) return cached;

	if (deriving.has(properties)) throw cycleError(source);

	deriving.add(properties);

	try {
		const shape: t.TProperties = {
			id: UuidDTO,
			createdAt: DateTimeDTO,
			updatedAt: t.Optional(DateTimeDTO),
		};

		for (const [key, propertyClass] of Object.entries(properties)) {
			if (!isEntityClass(propertyClass)) {
				shape[key] = modelOfValueObject(propertyClass);
				continue;
			}

			const nested = definitionOf(propertyClass);

			shape[key] = modelFor(nested.properties, nested.source).model;
		}

		const model = t.Object(shape, { additionalProperties: false });
		const entry: ModelEntry = { model, validator: Schema.make(model) };

		models.set(properties, entry);

		return entry;
	} finally {
		deriving.delete(properties);
	}
}

function extractIdentity(
	source: string,
	raw?: Record<string, unknown>,
): EntityDTO | undefined {
	const { id, createdAt, updatedAt } = (raw ?? {}) as Partial<IRawEntity>;

	if (id === undefined && createdAt === undefined && updatedAt === undefined)
		return undefined;

	if (id === undefined) throw new InvalidPropertyException("id", source);

	if (createdAt === undefined)
		throw new InvalidPropertyException("createdAt", source);

	return { id, createdAt, updatedAt };
}

function buildBaseContext(source: string, raw?: EntityDTO): BaseContext {
	const base = raw ?? makeEntity();

	return {
		id: new UuidVO(base.id, { name: "id", source }),
		createdAt: new DateTimeVO(base.createdAt, {
			name: "createdAt",
			source,
		}),
		updatedAt: base.updatedAt
			? new DateTimeVO(base.updatedAt, { name: "updatedAt", source })
			: undefined,
	};
}

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

function buildContext<PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
	source: string,
	raw: Record<string, unknown> | undefined,
	useDefault: boolean,
): ContextOf<PropertiesShape> {
	if (constructing.has(properties)) throw cycleError(source);

	constructing.add(properties);

	try {
		return {
			...buildBaseContext(source, extractIdentity(source, raw)),
			...Object.fromEntries(
				Object.keys(properties).map((key) => [
					key,
					buildProperty(properties, source, key, raw?.[key], useDefault),
				]),
			),
		} as ContextOf<PropertiesShape>;
	} finally {
		constructing.delete(properties);
	}
}

function rawOf(property: AnyValueObject | AnyEntity): unknown {
	return isEntity(property)
		? property.toJSON()
		: (property as AnyValueObject).value;
}

export interface IBetterEntity<
	PropertiesShape extends PropertiesShapeBase = PropertiesShapeBase,
> {
	readonly [Source]: string;
	readonly [Properties]: PropertiesShape;
	readonly [Context]: ContextOf<PropertiesShape>;
	get id(): string;
	get createdAt(): string;
	get updatedAt(): string | undefined;
	get schema(): EntitySchemaOf<PropertiesShape>;
	toJSON(): SerializedEntity<PropertiesShape>;
	toString(): string;
	set<Key extends keyof PropertiesShape>(
		key: Key,
		value: InputValueOf<PropertiesShape[Key]>,
	): void;
	setMany(values: Partial<InputValuesOf<PropertiesShape>>): void;
	get<Key extends ReadableKey<PropertiesShape>>(
		key: Key,
	): ReadValueOf<PropertiesShape, Key>;
}

export abstract class BetterEntity<
	const PropertiesShape extends PropertiesShapeBase,
> implements IBetterEntity<PropertiesShape>
{
	public readonly [Properties]: PropertiesShape;
	public readonly [Context]: ContextOf<PropertiesShape>;
	public readonly [Source]: string;
	protected readonly [Storage]: EntityStorage;

	protected abstract defineEntity(): EntityDefinition<PropertiesShape>;

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

	public static demo<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(this: Self): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` é a subclasse concreta que recebeu a chamada; trocar por `BetterEntity` construiria a base abstrata.
		return Reflect.construct(this as never, [Demo]) as Self["prototype"];
	}

	public static fromJSON<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(
		this: Self,
		data: SerializedEntity<PropertiesOfClass<Self>>,
	): Self["prototype"] {
		// A sonda lê o blueprint sem rodar construtor nenhum, para a validação
		// acontecer antes de qualquer ValueObject ser construído.
		// biome-ignore lint/complexity/noThisInStatic: `this` é a subclasse concreta que recebeu a chamada; trocar por `BetterEntity` sondaria a base abstrata.
		const probe = Object.create(this.prototype) as object;

		const { properties, source } = readDefinition<PropertiesShapeBase>(probe);

		if (!modelFor(properties, source).validator.match(data))
			throw new InvalidDomainDataException(source);

		// biome-ignore lint/complexity/noThisInStatic: idem — construir `BetterEntity` daria uma instância da base abstrata, não da subclasse.
		return Reflect.construct(this as never, [data]) as Self["prototype"];
	}

	public get id(): string {
		return this[Context].id.value;
	}

	public get createdAt(): string {
		return this[Context].createdAt.value;
	}

	public get updatedAt(): string | undefined {
		return this[Context].updatedAt?.value;
	}

	public get schema(): EntitySchemaOf<PropertiesShape> {
		return modelFor(this[Properties], this[Source])
			.model as unknown as EntitySchemaOf<PropertiesShape>;
	}

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

	public toString(): string {
		return JSON.stringify(this.toJSON());
	}

	public set<Key extends keyof PropertiesShape>(
		key: Key,
		value: InputValueOf<PropertiesShape[Key]>,
	): void {
		this.setMany({ [key]: value } as unknown as Partial<
			InputValuesOf<PropertiesShape>
		>);
	}

	public setMany(values: Partial<InputValuesOf<PropertiesShape>>): void {
		const entries = Object.entries(values);

		for (const [key] of entries)
			if (RAW_ENTITY_KEYS.has(key) || !Object.hasOwn(this[Properties], key))
				throw new InvalidPropertyException(key, this[Source]);

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

		this[Context].updatedAt = DateTimeVO.demo({
			name: "updatedAt",
			source: this[Source],
		});
	}

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

export { Storage };

export type { AccessorsOf, EntityDefinition, RawContextOf, SerializedEntity };
