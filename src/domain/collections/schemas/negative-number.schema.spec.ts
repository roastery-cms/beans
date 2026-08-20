import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { NegativeNumberSchema } from "./negative-number.schema";

describe("NegativeNumberSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(NegativeNumberSchema, 0)).toBe(true);
	});

	it("should validate a negative number", () => {
		expect(SchemaManager.match(NegativeNumberSchema, -42)).toBe(true);
	});

	it("should validate a negative decimal", () => {
		expect(SchemaManager.match(NegativeNumberSchema, -3.14)).toBe(true);
	});

	it("should invalidate a positive number", () => {
		expect(SchemaManager.match(NegativeNumberSchema, 1)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(NegativeNumberSchema, "-42")).toBe(false);
	});
});
