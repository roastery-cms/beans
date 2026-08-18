import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { UuidSchema } from "./uuid.schema";
import { generateUUID } from "@/domain/entity/helpers";

describe("UuidSchema", () => {
	it("should validate a valid UUID v7", () => {
		expect(SchemaManager.match(UuidSchema, generateUUID())).toBe(true);
	});

	it("should validate another valid UUID", () => {
		expect(SchemaManager.match(UuidSchema, generateUUID())).toBe(true);
	});

	it("should invalidate a non-UUID string", () => {
		expect(SchemaManager.match(UuidSchema, "not-a-uuid")).toBe(false);
	});

	it("should invalidate a UUID with missing segments", () => {
		expect(SchemaManager.match(UuidSchema, "550e8400-e29b-41d4-a716")).toBe(
			false,
		);
	});

	it("should invalidate an empty string", () => {
		expect(SchemaManager.match(UuidSchema, "")).toBe(false);
	});
});
