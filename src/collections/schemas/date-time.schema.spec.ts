import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { DateTimeSchema } from "./date-time.schema";

describe("DateTimeSchema", () => {
	it("should validate a valid ISO 8601 date-time string", () => {
		expect(
			SchemaManager.match(DateTimeSchema, "2023-01-01T00:00:00.000Z"),
		).toBe(true);
	});

	it("should validate another valid ISO 8601 date-time string", () => {
		expect(
			SchemaManager.match(DateTimeSchema, "2023-12-31T23:59:59.999Z"),
		).toBe(true);
	});

	it("should invalidate a non-date string", () => {
		expect(SchemaManager.match(DateTimeSchema, "not-a-date")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(SchemaManager.match(DateTimeSchema, 1672531200000)).toBe(false);
	});
});
