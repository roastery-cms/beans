import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { SlugDTO } from "./slug.dto";

describe("SlugDTO", () => {
	const validator = new Schema(SlugDTO);

	it("should validate a simple slug", () => {
		expect(validator.match("my-cool-post")).toBe(true);
	});

	it("should validate a single-word slug", () => {
		expect(validator.match("post")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});

	it("should invalidate a string with spaces", () => {
		expect(validator.match("my cool post")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(validator.match(123)).toBe(false);
	});
});
