import { describe, expect, it } from "bun:test";
import { BooleanSchema } from "./boolean.schema";

describe("BooleanSchema", () => {
	it("should validate true", () => {
		expect(BooleanSchema.match(true)).toBe(true);
	});

	it("should validate false", () => {
		expect(BooleanSchema.match(false)).toBe(true);
	});

	it("should invalidate a string", () => {
		expect(BooleanSchema.match("true")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(BooleanSchema.match(1)).toBe(false);
	});

	it("should invalidate null", () => {
		expect(BooleanSchema.match(null)).toBe(false);
	});
});
