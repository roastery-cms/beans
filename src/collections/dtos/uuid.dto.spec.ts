import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { UuidDTO } from "./uuid.dto";
import { generateUUID } from "@/entity/helpers";

describe("UuidDTO", () => {
	const validator = new Schema(UuidDTO);

	it("should validate a valid UUID v7", () => {
		expect(validator.match(generateUUID())).toBe(true);
	});

	it("should validate another valid UUID", () => {
		expect(validator.match(generateUUID())).toBe(true);
	});

	it("should invalidate a non-UUID string", () => {
		expect(validator.match("not-a-uuid")).toBe(false);
	});

	it("should invalidate a UUID with missing segments", () => {
		expect(validator.match("550e8400-e29b-41d4-a716")).toBe(false);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});
});
