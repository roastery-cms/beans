import { describe, expect, it } from "bun:test";
import { SlugObjectSchema } from "./slug-object.schema";

describe("SlugObjectSchema", () => {
	it("should validate an object with a valid slug", () => {
		expect(SlugObjectSchema.match({ slug: "my-cool-post" })).toBe(true);
	});

	it("should invalidate an object with an empty slug", () => {
		expect(SlugObjectSchema.match({ slug: "" })).toBe(false);
	});

	it("should invalidate an object with a slug containing spaces", () => {
		expect(SlugObjectSchema.match({ slug: "my cool post" })).toBe(false);
	});

	it("should invalidate an object missing the slug field", () => {
		expect(SlugObjectSchema.match({})).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(SlugObjectSchema.match("my-cool-post")).toBe(false);
	});
});
