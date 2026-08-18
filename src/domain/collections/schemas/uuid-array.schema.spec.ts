import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { UuidArraySchema } from "./uuid-array.schema";
import { generateUUID } from "@/domain/entity/helpers";

describe("UuidArraySchema", () => {
	it("should validate an array of valid UUIDs", () => {
		expect(SchemaManager.match(UuidArraySchema, [generateUUID()])).toBe(true);
	});

	it("should validate an empty array", () => {
		expect(SchemaManager.match(UuidArraySchema, [])).toBe(true);
	});

	it("should invalidate an array with non-UUID strings", () => {
		expect(SchemaManager.match(UuidArraySchema, ["not-a-uuid"])).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(
			SchemaManager.match(
				UuidArraySchema,
				"550e8400-e29b-41d4-a716-446655440000",
			),
		).toBe(false);
	});

	it("should invalidate an array with mixed valid and invalid UUIDs", () => {
		expect(
			SchemaManager.match(UuidArraySchema, [
				"550e8400-e29b-41d4-a716-446655440000",
				"invalid",
			]),
		).toBe(false);
	});
});
