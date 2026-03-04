import { describe, expect, it } from "bun:test";
import { SimpleUrlSchema } from "./simple-url.schema";

describe("SimpleUrlSchema", () => {
	it("should validate a redis URL", () => {
		expect(SimpleUrlSchema.match("redis://localhost:6739")).toBe(true);
	});

	it("should validate an http URL", () => {
		expect(SimpleUrlSchema.match("http://example.com")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(SimpleUrlSchema.match("")).toBe(false);
	});

	it("should invalidate a plain path without protocol", () => {
		expect(SimpleUrlSchema.match("/some/path")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(SimpleUrlSchema.match(123)).toBe(false);
	});
});
