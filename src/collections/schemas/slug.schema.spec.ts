import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { SlugSchema } from "./slug.schema";

describe("SlugSchema", () => {
	it("should validate a simple slug", () => {
		expect(SchemaManager.match(SlugSchema, "my-cool-post")).toBe(true);
	});

	it("should validate a single-word slug", () => {
		expect(SchemaManager.match(SlugSchema, "post")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(SchemaManager.match(SlugSchema, "")).toBe(false);
	});

	it("should invalidate a string with spaces", () => {
		expect(SchemaManager.match(SlugSchema, "my cool post")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(SchemaManager.match(SlugSchema, 123)).toBe(false);
	});
});
