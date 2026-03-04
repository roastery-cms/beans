import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { StringDTO } from "./string.dto";

describe("StringDTO", () => {
	const validator = new Schema(StringDTO);

	it("should validate a non-empty string", () => {
		expect(validator.match("Hello World")).toBe(true);
	});

	it("should validate a single character", () => {
		expect(validator.match("a")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(validator.match(42)).toBe(false);
	});

	it("should invalidate null", () => {
		expect(validator.match(null)).toBe(false);
	});
});
