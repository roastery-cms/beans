import { describe, expect, it } from "bun:test";
import { SlugSchema } from "./slug.schema";

describe("SlugSchema", () => {
	it("should validate a simple slug", () => {
		expect(SlugSchema.match("my-cool-post")).toBe(true);
	});

	it("should validate a single-word slug", () => {
		expect(SlugSchema.match("post")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(SlugSchema.match("")).toBe(false);
	});

	it("should invalidate a string with spaces", () => {
		expect(SlugSchema.match("my cool post")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(SlugSchema.match(123)).toBe(false);
	});
});
