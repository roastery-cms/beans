import { describe, expect, it } from "bun:test";
import { NumberSchema } from "./number.schema";

describe("NumberSchema", () => {
	it("should validate zero", () => {
		expect(NumberSchema.match(0)).toBe(true);
	});

	it("should validate a positive number", () => {
		expect(NumberSchema.match(42)).toBe(true);
	});

	it("should validate a decimal number", () => {
		expect(NumberSchema.match(3.14)).toBe(true);
	});

	it("should invalidate a negative number", () => {
		expect(NumberSchema.match(-1)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(NumberSchema.match("42")).toBe(false);
	});
});
