import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { StringArrayDTO } from "./string-array.dto";

describe("StringArrayDTO", () => {
	const validator = new Schema(StringArrayDTO);

	it("should validate an array of strings", () => {
		expect(validator.match(["item1", "item2"])).toBe(true);
	});

	it("should validate an empty array", () => {
		expect(validator.match([])).toBe(true);
	});

	it("should invalidate an array with non-string items", () => {
		expect(validator.match([1, 2, 3])).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(validator.match("item1")).toBe(false);
	});

	it("should invalidate an array with mixed types", () => {
		expect(validator.match(["item1", 2])).toBe(false);
	});
});
