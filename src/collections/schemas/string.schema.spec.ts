import { describe, expect, it } from "bun:test";
import { StringSchema } from "./string.schema";

describe("StringSchema", () => {
	it("should validate a non-empty string", () => {
		expect(StringSchema.match("Hello World")).toBe(true);
	});

	it("should validate a single character", () => {
		expect(StringSchema.match("a")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(StringSchema.match("")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(StringSchema.match(42)).toBe(false);
	});

	it("should invalidate null", () => {
		expect(StringSchema.match(null)).toBe(false);
	});
});
