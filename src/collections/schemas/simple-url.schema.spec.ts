import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { SimpleUrlSchema } from "./simple-url.schema";

describe("SimpleUrlSchema", () => {
	it("should validate a redis URL", () => {
		expect(SchemaManager.match(SimpleUrlSchema, "redis://localhost:6739")).toBe(
			true,
		);
	});

	it("should validate an http URL", () => {
		expect(SchemaManager.match(SimpleUrlSchema, "http://localhost:3000")).toBe(
			true,
		);
	});

	it("should invalidate an empty string", () => {
		expect(SchemaManager.match(SimpleUrlSchema, "")).toBe(false);
	});

	it("should invalidate a non-URL string", () => {
		expect(SchemaManager.match(SimpleUrlSchema, "not a url")).toBe(false);
	});
});
