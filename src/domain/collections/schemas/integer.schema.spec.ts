import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { IntegerSchema } from "./integer.schema";

describe("IntegerSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(IntegerSchema, 0)).toBe(true);
	});

	it("should validate a positive integer", () => {
		expect(SchemaManager.match(IntegerSchema, 42)).toBe(true);
	});

	it("should validate a negative integer", () => {
		expect(SchemaManager.match(IntegerSchema, -42)).toBe(true);
	});

	it("should invalidate a decimal number", () => {
		expect(SchemaManager.match(IntegerSchema, 3.14)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(IntegerSchema, "42")).toBe(false);
	});
});
