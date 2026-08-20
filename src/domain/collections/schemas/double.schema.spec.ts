import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { DoubleSchema } from "./double.schema";

describe("DoubleSchema", () => {
	it("should validate zero", () => {
		expect(SchemaManager.match(DoubleSchema, 0)).toBe(true);
	});

	it("should validate a decimal number", () => {
		expect(SchemaManager.match(DoubleSchema, 42.5)).toBe(true);
	});

	it("should validate a negative decimal", () => {
		expect(SchemaManager.match(DoubleSchema, -42.5)).toBe(true);
	});

	it("should validate an integer", () => {
		expect(SchemaManager.match(DoubleSchema, 42)).toBe(true);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(DoubleSchema, "42.5")).toBe(false);
	});

	it("should invalidate null", () => {
		expect(SchemaManager.match(DoubleSchema, null)).toBe(false);
	});
});
