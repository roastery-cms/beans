import { describe, expect, it } from "bun:test";
import { DateTimeSchema } from "./date-time.schema";

describe("DateTimeSchema", () => {
	it("should validate a valid ISO 8601 date-time string", () => {
		expect(DateTimeSchema.match("2023-01-01T00:00:00.000Z")).toBe(true);
	});

	it("should validate another valid ISO 8601 date-time string", () => {
		expect(DateTimeSchema.match("2023-12-31T23:59:59.999Z")).toBe(true);
	});

	it("should invalidate a non-date string", () => {
		expect(DateTimeSchema.match("not-a-date")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(DateTimeSchema.match(1672531200000)).toBe(false);
	});
});
