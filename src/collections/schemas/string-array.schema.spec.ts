import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { StringArraySchema } from "./string-array.schema";

describe("StringArraySchema", () => {
	it("should validate an array of strings", () => {
		expect(SchemaManager.match(StringArraySchema, ["item1", "item2"])).toBe(
			true,
		);
	});

	it("should validate an empty array", () => {
		expect(SchemaManager.match(StringArraySchema, [])).toBe(true);
	});

	it("should invalidate an array with non-string items", () => {
		expect(SchemaManager.match(StringArraySchema, [1, 2, 3])).toBe(false);
	});

	it("should invalidate a string", () => {
		expect(SchemaManager.match(StringArraySchema, "item1")).toBe(false);
	});

	it("should invalidate an array with mixed types", () => {
		expect(SchemaManager.match(StringArraySchema, ["item1", 2])).toBe(false);
	});
});
