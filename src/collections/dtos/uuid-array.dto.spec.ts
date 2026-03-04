import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { UuidArrayDTO } from "./uuid-array.dto";
import { generateUUID } from "@/entity/helpers";

describe("UuidArrayDTO", () => {
	const validator = new Schema(UuidArrayDTO);

	it("should validate an array of valid UUIDs", () => {
		expect(validator.match([generateUUID()])).toBe(true);
	});

	it("should validate an empty array", () => {
		expect(validator.match([])).toBe(true);
	});

	it("should invalidate an array with non-UUID strings", () => {
		expect(validator.match(["not-a-uuid"])).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(validator.match("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
	});

	it("should invalidate an array with mixed valid and invalid UUIDs", () => {
		expect(
			validator.match(["550e8400-e29b-41d4-a716-446655440000", "invalid"]),
		).toBe(false);
	});
});
