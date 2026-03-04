import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { UrlDTO } from "./url.dto";

describe("UrlDTO", () => {
	const validator = new Schema(UrlDTO);

	it("should validate an https URL", () => {
		expect(validator.match("https://example.com/cover.jpg")).toBe(true);
	});

	it("should validate an http URL", () => {
		expect(validator.match("http://example.com/image.png")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});

	it("should invalidate a plain path without protocol", () => {
		expect(validator.match("/cover.jpg")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(validator.match(123)).toBe(false);
	});
});
