import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { PositiveDoubleSchema } from "./positive-double.schema";

describe("PositiveDoubleSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(PositiveDoubleSchema, 0)).toBe(true);
	});

	it("should validate a positive decimal", () => {
		expect(SchemaManager.match(PositiveDoubleSchema, 42.5)).toBe(true);
	});

	it("should invalidate a negative decimal", () => {
		expect(SchemaManager.match(PositiveDoubleSchema, -0.5)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(PositiveDoubleSchema, "42.5")).toBe(false);
	});
});
