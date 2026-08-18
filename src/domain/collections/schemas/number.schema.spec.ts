import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { NumberSchema } from "./number.schema";

describe("NumberSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(NumberSchema, 0)).toBe(true);
	});

	it("should validate a positive number", () => {
		expect(SchemaManager.match(NumberSchema, 42)).toBe(true);
	});

	it("should validate a decimal number", () => {
		expect(SchemaManager.match(NumberSchema, 3.14)).toBe(true);
	});

	it("should invalidate a negative number", () => {
		expect(SchemaManager.match(NumberSchema, -1)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(NumberSchema, "42")).toBe(false);
	});
});
