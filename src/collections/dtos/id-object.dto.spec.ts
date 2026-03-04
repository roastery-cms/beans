import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { IdObjectDTO } from "./id-object.dto";
import { generateUUID } from "@/entity/helpers";

describe("IdObjectDTO", () => {
	const validator = new Schema(IdObjectDTO);

	it("should validate an object with a valid UUID id", () => {
		expect(validator.match({ id: generateUUID() })).toBe(true);
	});

	it("should invalidate an object with an invalid UUID", () => {
		expect(validator.match({ id: "not-a-uuid" })).toBe(false);
	});

	it("should invalidate an object missing the id field", () => {
		expect(validator.match({})).toBe(false);
	});

	it("should invalidate an object with id as a number", () => {
		expect(validator.match({ id: 123 })).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(validator.match("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
	});
});
