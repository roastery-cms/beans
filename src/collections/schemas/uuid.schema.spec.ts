import { describe, expect, it } from "bun:test";
import { generateUUID } from "@/entity/helpers";
import { UuidSchema } from "./uuid.schema";

describe("UuidSchema", () => {
	it("should validate a valid UUID", () => {
		expect(UuidSchema.match(generateUUID())).toBe(true);
	});

	it("should invalidate a non-UUID string", () => {
		expect(UuidSchema.match("not-a-uuid")).toBe(false);
	});

	it("should invalidate a UUID with missing segments", () => {
		expect(UuidSchema.match("550e8400-e29b-41d4-a716")).toBe(false);
	});

	it("should invalidate an empty string", () => {
		expect(UuidSchema.match("")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(UuidSchema.match(123)).toBe(false);
	});
});
