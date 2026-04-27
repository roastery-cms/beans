import { describe, expect, it } from "bun:test";
import { Entity } from "../entity/entity";
import { Mapper } from "./mapper";
import { Schema } from "@roastery/terroir/schema";
import { makeEntity } from "../entity/factories";
import { EntitySchema, EntitySource, EntityContext } from "../entity/symbols";
import { generateUUID } from "../entity/helpers";
import { t } from "@roastery/terroir";
import { ValueObject } from "@/value-object";
import type { EntityDTO } from "@/entity/dtos";
import type { IValueObjectMetadata } from "@/value-object/types";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";

// 1. Define Schema
const TestDTO = t.Object({
	id: t.String(),
	createdAt: t.String(),
	updatedAt: t.Optional(t.String()),
	simpleField: t.String(),
	computedField: t.String(),
	valueObjectField: t.String(),
	arrayField: t.Array(t.String()),
	arrayValueObjectField: t.Array(t.String()),
	nestedEntityLike: t.Object({
		nested: t.String(),
	}),
	privateProp: t.String(),
});

const TestSchema = Schema.make(TestDTO);

// 2. Define Value Object
class TestValueObject extends ValueObject<string, typeof TestDTO> {
	protected override schema: Schema<typeof TestDTO> = TestSchema;

	public static create(value: string): TestValueObject {
		return new TestValueObject(value, { name: "", source: "" });
	}
	protected override validate() {
		if (!this.schema.match(this.value)) throw new Error();
	}
}

// 3. Define Entity
class TestEntity extends Entity<typeof TestDTO> {
	public readonly [EntitySchema] = TestSchema;

	public simpleField: string;
	public valueObjectField: TestValueObject;
	public arrayField: string[];
	public arrayValueObjectField: TestValueObject[];

	// This property matches the schema but is a nested object
	public nestedEntityLike = {
		toDTO: () => ({ nested: "dto" }),
	};

	// Private/Internal properties that should be ignored
	public _privateProp = "secret";
	public __ignoredInstanceProp = "ignored";

	public constructor(
		data: EntityDTO & {
			simpleField?: string;
			valueObjectField?: TestValueObject;
			arrayField?: string[];
			arrayValueObjectField?: TestValueObject[];
		},
	) {
		super(data, "test");
		this.simpleField = data.simpleField ?? "default";
		this.valueObjectField =
			data.valueObjectField ?? TestValueObject.create("vo-value");
		this.arrayField = data.arrayField ?? ["a", "b"];
		this.arrayValueObjectField = data.arrayValueObjectField ?? [
			TestValueObject.create("vo1"),
		];
	}

	public get computedField(): string {
		return `computed-${this.simpleField}`;
	}

	public get __secretGetter(): string {
		return "should-be-ignored";
	}

	public regularMethod(): string {
		return "method";
	}

	public override [EntityContext](name: string): IValueObjectMetadata {
		return { name, source: this[EntitySource] };
	}

	public static create(
		data?: Partial<EntityDTO> & {
			simpleField?: string;
			valueObjectField?: TestValueObject;
			arrayField?: string[];
			arrayValueObjectField?: TestValueObject[];
		},
	): TestEntity {
		const baseData = makeEntity();
		return new TestEntity({ ...baseData, ...data });
	}
}

describe("Mapper", () => {
	it("should map basic entity fields", () => {
		const entity = TestEntity.create({ simpleField: "test-value" });
		const dto = Mapper.toDTO(entity);

		expect(dto.id).toBe(entity.id);
		expect(dto.createdAt).toBe(entity.createdAt);
		expect(dto.updatedAt).toBeUndefined();
		expect(dto.simpleField).toBe("test-value");
	});

	it("should map updatedAt when present", () => {
		const now = new Date().toISOString();
		const entity = TestEntity.create({ updatedAt: now });
		const dto = Mapper.toDTO(entity);
		expect(dto.updatedAt).toBe(now);
	});

	it("should map getters", () => {
		const entity = TestEntity.create({ simpleField: "test" });
		const dto = Mapper.toDTO(entity);
		expect(dto.computedField).toBe("computed-test");
	});

	it("should map ValueObjects to their values", () => {
		const vo = TestValueObject.create("custom-vo");
		const entity = TestEntity.create({ valueObjectField: vo });
		const dto = Mapper.toDTO(entity);
		expect(dto.valueObjectField).toBe("custom-vo");
	});

	it("should map arrays of primitives", () => {
		const arr = ["x", "y"];
		const entity = TestEntity.create({ arrayField: arr });
		const dto = Mapper.toDTO(entity);
		expect(dto.arrayField).toEqual(["x", "y"]);
	});

	it("should map arrays of ValueObjects", () => {
		const arr = [TestValueObject.create("1"), TestValueObject.create("2")];
		const entity = TestEntity.create({ arrayValueObjectField: arr });
		const dto = Mapper.toDTO(entity);
		expect(dto.arrayValueObjectField).toEqual(["1", "2"]);
	});

	it("should map nested objects with toDTO method", () => {
		const entity = TestEntity.create();
		const dto = Mapper.toDTO(entity);
		expect(dto.nestedEntityLike).toEqual({ nested: "dto" });
	});

	it("should ignore internal properties starting with double underscore", () => {
		const entity = TestEntity.create();
		const dto = Mapper.toDTO(entity);
		// @ts-expect-error - testing runtime behavior of stripping internal props
		expect(dto.__source).toBeUndefined();
		// @ts-expect-error - testing runtime behavior
		expect(dto.__schema).toBeUndefined();
		// @ts-expect-error - testing runtime behavior
		expect(dto.__secretGetter).toBeUndefined();
		expect((dto as Record<string, unknown>).regularMethod).toBeUndefined();
		expect(
			(dto as Record<string, unknown>).__ignoredInstanceProp,
		).toBeUndefined();
	});

	it("should include properties starting with single underscore but strip the underscore from key", () => {
		const entity = TestEntity.create();
		const dto = Mapper.toDTO(entity);

		// The property is _privateProp on the entity
		// The mapper logic: const finalKey = key.startsWith("_") ? key.slice(1) : key;
		// So _privateProp becomes privateProp in DTO

		expect(dto.privateProp).toBe("secret");

		// Ensure the original key is NOT present
		// @ts-expect-error
		expect(dto._privateProp).toBeUndefined();
	});

	it("should throw InvalidDomainDataException when mapped data does not match schema", () => {
		const entity = TestEntity.create({ simpleField: "test" });

		// Force an invalid state that violates the schema (simpleField should be string)
		// @ts-expect-error - forcing invalid type for testing purposes
		entity.simpleField = 123;

		// The mapper validates against entity[EntitySchema] which expects string
		expect(() => Mapper.toDTO(entity)).toThrow(InvalidDomainDataException);
	});

	describe("toDomain", () => {
		it("should create an entity from DTO using a factory", () => {
			const dto: t.Static<typeof TestDTO> = {
				id: generateUUID(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				simpleField: "from-dto",
				computedField: "computed-from-dto",
				valueObjectField: "vo-value",
				arrayField: ["a"],
				arrayValueObjectField: ["vo1"],
				nestedEntityLike: { nested: "dto" },
				privateProp: "secret",
			};

			const entity = Mapper.toDomain<typeof TestDTO>(dto, (data, props) => {
				return TestEntity.create({
					...data,
					...props,
					valueObjectField: TestValueObject.create(data.valueObjectField),
					arrayValueObjectField: data.arrayValueObjectField.map((v) =>
						TestValueObject.create(v),
					),
				});
			});

			entity;

			expect(entity).toBeInstanceOf(TestEntity);
			expect(entity.id).toBe(dto.id);
			expect(entity.createdAt).toBe(dto.createdAt);
			expect(entity.updatedAt).toBe(dto.updatedAt);
			expect((entity as TestEntity).simpleField).toBe("from-dto");
		});
	});
});
