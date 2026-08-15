import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { StringSchema } from "./string.schema";

describe("StringSchema", () => {
	it("should validate a non-empty string", () => {
		expect(SchemaManager.match(StringSchema, "Hello World")).toBe(true);
	});

	it("should validate a single character", () => {
		expect(SchemaManager.match(StringSchema, "a")).toBe(true);
	});

	it("should validate an empty string", () => {
		expect(SchemaManager.match(StringSchema, "")).toBe(true);
	});

	it("should invalidate a number", () => {
		expect(SchemaManager.match(StringSchema, 42)).toBe(false);
	});

	it("should invalidate null", () => {
		expect(SchemaManager.match(StringSchema, null)).toBe(false);
	});
});
