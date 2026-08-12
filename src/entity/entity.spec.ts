import { describe, expect, it } from "bun:test";
import { Entity } from "./entity";
import type { IRawEntity } from "./types";
import { Schema } from "@roastery/terroir/schema";
import { t } from "@roastery/terroir";
import { EntitySchema, EntitySource, EntityStorage } from "./symbols";
import { makeEntity } from "./factories";
import type { EntityDTO } from "./dtos";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { EntityStorage as EntityStorageImpl } from "./entity-storage";

const TestDTO = t.Object({
	id: t.String(),
	createdAt: t.String(),
	updatedAt: t.Optional(t.String()),
});
const TestSchema = Schema.make(TestDTO);

class TestEntity extends Entity<typeof TestDTO> {
	public readonly [EntitySchema] = TestSchema;

	public constructor(data: EntityDTO) {
		super(data, "test");
	}

	static make(data: IRawEntity) {
		return new TestEntity(data);
	}

	public static create(data?: EntityDTO): TestEntity {
		const entityData = data ?? makeEntity();
		const preparedData = new TestEntity(entityData);
		return new TestEntity(preparedData);
	}

	public touch(): void {
		this.update();
	}

	public getStorage(): EntityStorageImpl {
		return this[EntityStorage];
	}
}

describe("Entity", () => {
	it("should create a valid entity instance", () => {
		const data = makeEntity();
		const entity = TestEntity.make(data);

		expect(entity.id).toBe(data.id);
		expect(entity.createdAt).toBe(new Date(data.createdAt).toISOString());
		if (data.updatedAt) {
			expect(entity.updatedAt).toBe(new Date(data.updatedAt).toISOString());
		}
		expect(entity[EntitySource]).toBe("test");
	});

	it("should normalize dates during construction", () => {
		// Test ensuring dates are ISO strings
		const date = new Date();
		const data = makeEntity();
		data.createdAt = date.toISOString();

		const entity = TestEntity.make(data);
		expect(entity.createdAt).toBe(date.toISOString());
	});

	it("should throw InvalidEntityData if prepare receives invalid data", () => {
		const invalidData = { id: "invalid-uuid" } as IRawEntity;
		expect(() => TestEntity.create(invalidData)).toThrow(
			InvalidPropertyException,
		);
	});

	it("should update updatedAt field when update() is called", async () => {
		const entity = TestEntity.create();
		const originalUpdatedAt = entity.updatedAt;

		// Ensure strictly greater time
		await new Promise((resolve) => setTimeout(resolve, 10));

		entity.touch();

		expect(entity.updatedAt).toBeDefined();
		expect(new Date(entity.updatedAt!).getTime()).toBeGreaterThan(
			originalUpdatedAt ? new Date(originalUpdatedAt).getTime() : 0,
		);
	});

	it("should handle undefined updatedAt gracefully", () => {
		const data = makeEntity();
		data.updatedAt = undefined;
		const entity = TestEntity.make(data);
		expect(entity.updatedAt).toBeUndefined();
	});

	it("should handle defined updatedAt correctly", () => {
		const now = new Date().toISOString();
		const data = makeEntity();
		data.updatedAt = now;
		const entity = TestEntity.make(data);
		expect(entity.updatedAt).toBe(now);
	});

	describe("EntityStorage", () => {
		it("deve inicializar o storage na construção", () => {
			const entity = TestEntity.make(makeEntity());
			expect(entity.getStorage()).toBeInstanceOf(EntityStorageImpl);
		});

		it("deve retornar null para chave não definida no storage", () => {
			const entity = TestEntity.make(makeEntity());
			expect(entity.getStorage().get("qualquer")).toBeNull();
		});

		it("deve armazenar e recuperar valores no storage", () => {
			const entity = TestEntity.make(makeEntity());
			entity.getStorage().set("chave", "valor");
			expect(entity.getStorage().get("chave")).toBe("valor");
		});

		it("deve remover valores do storage com del", () => {
			const entity = TestEntity.make(makeEntity());
			entity.getStorage().set("chave", "valor");
			entity.getStorage().del("chave");
			expect(entity.getStorage().get("chave")).toBeNull();
		});

		it("cada instância deve ter seu próprio storage isolado", () => {
			const a = TestEntity.make(makeEntity());
			const b = TestEntity.make(makeEntity());
			a.getStorage().set("chave", "de-a");
			expect(b.getStorage().get("chave")).toBeNull();
		});
	});
});
