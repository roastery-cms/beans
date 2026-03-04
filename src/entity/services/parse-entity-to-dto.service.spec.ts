import { describe, expect, it } from "bun:test";
import { ParseEntityToDTOService } from "./parse-entity-to-dto.service";
import { Schema } from "@roastery/terroir/schema";
import { EntitySchema, EntitySource } from "../symbols";
import type { IEntity } from "../types";
import { ValueObject } from "@/value-object";
import { t } from "@roastery/terroir";

const DummySchema = Schema.make(t.Object({}));

describe("ParseEntityToDTOService", () => {
	it("should map nested objects that implement toDTO()", () => {
		const nested = {
			toDTO: () => ({ nested: "value" }),
		};
		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			prop: nested,
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;
		expect(result.prop).toEqual({ nested: "value" });
	});

	it("should map arrays recursively", () => {
		const nested = {
			toDTO: () => "mapped",
		};
		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			list: [nested, "simple"],
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;
		expect(result.list).toEqual(["mapped", "simple"]);
	});

	it("should map ValueObject to its value", () => {
		const dummyValueObject = Object.create(ValueObject.prototype);
		dummyValueObject.value = "vo-value";

		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			prop: dummyValueObject,
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;
		expect(result.prop).toEqual("vo-value");
	});

	it("should map Schema to its string representation", () => {
		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			schemaProp: DummySchema,
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;
		expect(result.schemaProp).toEqual(DummySchema.toString());
	});

	it("should handle object properties properly (removing _, ignoring __)", () => {
		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			normalProp: "normal",
			_underscoredProp: "exposed",
			__secretProp: "hidden",
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;

		expect(result).toHaveProperty("normalProp", "normal");
		expect(result).toHaveProperty("underscoredProp", "exposed");
		expect(result).not.toHaveProperty("_underscoredProp");
		expect(result).not.toHaveProperty("__secretProp");
	});

	it("should handle null/undefined gracefully in processValue", () => {
		const entity = {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
			nullable: null,
			undef: undefined,
		} as unknown as IEntity<ReturnType<typeof t.Object>>;

		const result = ParseEntityToDTOService.run(entity) as Record<
			string,
			unknown
		>;
		expect(result.nullable).toBeNull();
		expect(result.undef).toBeUndefined();
	});

	it("should filter prototype properties correctly", () => {
		const proto = Object.create(null);

		// 1. Getter normal (deve passar)
		Object.defineProperty(proto, "normalGetter", {
			get: () => "ok",
			enumerable: true,
			configurable: true,
		});

		// 2. Getter com __ (deve ser ignorado)
		Object.defineProperty(proto, "__secretGetter", {
			get: () => "shh",
			enumerable: true,
			configurable: true,
		});

		// 3. Método normal (não é getter, deve ser ignorado)
		Object.defineProperty(proto, "method", {
			value: () => "fn",
			enumerable: true,
			configurable: true,
		});

		// 4. Getter com _ (deve ser exposto sem o _)
		Object.defineProperty(proto, "_underscoredGetter", {
			get: () => "exposed",
			enumerable: true,
			configurable: true,
		});

		const entity = Object.create(proto);
		Object.assign(entity, {
			[EntitySchema]: DummySchema,
			[EntitySource]: "test",
		});

		const result = ParseEntityToDTOService.run(entity);

		expect(result).toHaveProperty("normalGetter", "ok");
		expect(result).not.toHaveProperty("__secretGetter");
		expect(result).not.toHaveProperty("method");
		expect(result).toHaveProperty("underscoredGetter", "exposed");
	});
});
