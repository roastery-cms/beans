import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { UrlSchema } from "./url.schema";

describe("UrlSchema", () => {
	it("should validate an https URL", () => {
		expect(
			SchemaManager.match(UrlSchema, "https://example.com/cover.jpg"),
		).toBe(true);
	});

	it("should validate an http URL", () => {
		expect(SchemaManager.match(UrlSchema, "http://example.com/image.png")).toBe(
			true,
		);
	});

	it("should invalidate an empty string", () => {
		expect(SchemaManager.match(UrlSchema, "")).toBe(false);
	});

	it("should invalidate a plain path without protocol", () => {
		expect(SchemaManager.match(UrlSchema, "/cover.jpg")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(SchemaManager.match(UrlSchema, 123)).toBe(false);
	});
});
