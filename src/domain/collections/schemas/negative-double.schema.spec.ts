import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { NegativeDoubleSchema } from "./negative-double.schema";

describe("NegativeDoubleSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(NegativeDoubleSchema, 0)).toBe(true);
	});

	it("should validate a negative decimal", () => {
		expect(SchemaManager.match(NegativeDoubleSchema, -42.5)).toBe(true);
	});

	it("should invalidate a positive decimal", () => {
		expect(SchemaManager.match(NegativeDoubleSchema, 0.5)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(NegativeDoubleSchema, "-42.5")).toBe(false);
	});
});
