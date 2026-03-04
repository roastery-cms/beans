import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { BooleanDTO } from "./boolean.dto";

describe("BooleanDTO", () => {
	const validator = new Schema(BooleanDTO);

	it("should validate true", () => {
		expect(validator.match(true)).toBe(true);
	});

	it("should validate false", () => {
		expect(validator.match(false)).toBe(true);
	});

	it("should invalidate a string", () => {
		expect(validator.match("true")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(validator.match(1)).toBe(false);
	});

	it("should invalidate null", () => {
		expect(validator.match(null)).toBe(false);
	});
});
