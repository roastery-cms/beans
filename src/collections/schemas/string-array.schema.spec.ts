import { describe, expect, it } from "bun:test";
import { StringArraySchema } from "./string-array.schema";

describe("StringArraySchema", () => {
	it("should validate an array of strings", () => {
		expect(StringArraySchema.match(["item1", "item2"])).toBe(true);
	});

	it("should validate an empty array", () => {
		expect(StringArraySchema.match([])).toBe(true);
	});

	it("should invalidate an array with non-string items", () => {
		expect(StringArraySchema.match([1, 2, 3])).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(StringArraySchema.match("item1")).toBe(false);
	});

	it("should invalidate an array with mixed types", () => {
		expect(StringArraySchema.match(["item1", 2])).toBe(false);
	});
});
