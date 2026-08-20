import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { PositiveIntegerSchema } from "./positive-integer.schema";

describe("PositiveIntegerSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(PositiveIntegerSchema, 0)).toBe(true);
	});

	it("should validate a positive integer", () => {
		expect(SchemaManager.match(PositiveIntegerSchema, 42)).toBe(true);
	});

	it("should invalidate a negative integer", () => {
		expect(SchemaManager.match(PositiveIntegerSchema, -1)).toBe(false);
	});

	it("should invalidate a decimal number", () => {
		expect(SchemaManager.match(PositiveIntegerSchema, 3.14)).toBe(false);
	});
});
