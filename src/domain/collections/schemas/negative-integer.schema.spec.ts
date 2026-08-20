import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { NegativeIntegerSchema } from "./negative-integer.schema";

describe("NegativeIntegerSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(NegativeIntegerSchema, 0)).toBe(true);
	});

	it("should validate a negative integer", () => {
		expect(SchemaManager.match(NegativeIntegerSchema, -42)).toBe(true);
	});

	it("should invalidate a positive integer", () => {
		expect(SchemaManager.match(NegativeIntegerSchema, 1)).toBe(false);
	});

	it("should invalidate a negative decimal", () => {
		expect(SchemaManager.match(NegativeIntegerSchema, -3.14)).toBe(false);
	});
});
