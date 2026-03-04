import { describe, expect, it } from "bun:test";
import { UrlSchema } from "./url.schema";

describe("UrlSchema", () => {
	it("should validate an https URL", () => {
		expect(UrlSchema.match("https://example.com/cover.jpg")).toBe(true);
	});

	it("should validate an http URL", () => {
		expect(UrlSchema.match("http://example.com/image.png")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(UrlSchema.match("")).toBe(false);
	});

	it("should invalidate a plain path without protocol", () => {
		expect(UrlSchema.match("/cover.jpg")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(UrlSchema.match(123)).toBe(false);
	});
});
