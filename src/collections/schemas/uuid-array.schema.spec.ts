import { describe, expect, it } from "bun:test";
import { generateUUID } from "@/entity/helpers";
import { UuidArraySchema } from "./uuid-array.schema";

describe("UuidArraySchema", () => {
	it("should validate an array of valid UUIDs", () => {
		expect(UuidArraySchema.match([generateUUID()])).toBe(true);
	});

	it("should validate an empty array", () => {
		expect(UuidArraySchema.match([])).toBe(true);
	});

	it("should invalidate an array with non-UUID strings", () => {
		expect(UuidArraySchema.match(["not-a-uuid"])).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(UuidArraySchema.match("550e8400-e29b-41d4-a716-446655440000")).toBe(
			false,
		);
	});

	it("should invalidate an array with mixed valid and invalid UUIDs", () => {
		expect(UuidArraySchema.match([generateUUID(), "invalid"])).toBe(false);
	});
});
