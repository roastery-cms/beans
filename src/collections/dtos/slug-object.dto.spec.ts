import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { SlugObjectDTO } from "./slug-object.dto";

describe("SlugObjectDTO", () => {
	const validator = new Schema(SlugObjectDTO);

	it("should validate an object with a valid slug", () => {
		expect(validator.match({ slug: "my-cool-post" })).toBe(true);
	});

	it("should invalidate an object with an empty slug", () => {
		expect(validator.match({ slug: "" })).toBe(false);
	});

	it("should invalidate an object with a slug containing spaces", () => {
		expect(validator.match({ slug: "my cool post" })).toBe(false);
	});

	it("should invalidate an object missing the slug field", () => {
		expect(validator.match({})).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(validator.match("my-cool-post")).toBe(false);
	});
});
