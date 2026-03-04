import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { NumberDTO } from "./number.dto";

describe("NumberDTO", () => {
	const validator = new Schema(NumberDTO);

	it("should validate zero", () => {
		expect(validator.match(0)).toBe(true);
	});

	it("should validate a positive number", () => {
		expect(validator.match(42)).toBe(true);
	});

	it("should validate a decimal number", () => {
		expect(validator.match(3.14)).toBe(true);
	});

	it("should invalidate a negative number", () => {
		expect(validator.match(-1)).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(validator.match("42")).toBe(false);
	});
});
