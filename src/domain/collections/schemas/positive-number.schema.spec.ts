import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { PositiveNumberSchema } from "./positive-number.schema";

describe("PositiveNumberSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(PositiveNumberSchema, 0)).toBe(true);
	});

	it("should validate a positive number", () => {
		expect(SchemaManager.match(PositiveNumberSchema, 42)).toBe(true);
	});

	it("should validate a decimal number", () => {
		expect(SchemaManager.match(PositiveNumberSchema, 3.14)).toBe(true);
	});

	it("should invalidate a negative number", () => {
		expect(SchemaManager.match(PositiveNumberSchema, -1)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(PositiveNumberSchema, "42")).toBe(false);
	});
});
