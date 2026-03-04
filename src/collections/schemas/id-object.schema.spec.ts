import { describe, expect, it } from "bun:test";
import { generateUUID } from "@/entity/helpers";
import { IdObjectSchema } from "./id-object.schema";

describe("IdObjectSchema", () => {
	it("should validate an object with a valid UUID id", () => {
		expect(IdObjectSchema.match({ id: generateUUID() })).toBe(true);
	});

	it("should invalidate an object with an invalid UUID", () => {
		expect(IdObjectSchema.match({ id: "not-a-uuid" })).toBe(false);
	});

	it("should invalidate an object missing the id field", () => {
		expect(IdObjectSchema.match({})).toBe(false);
	});

	it("should invalidate an object with id as a number", () => {
		expect(IdObjectSchema.match({ id: 123 })).toBe(false);
	});

	it("should invalidate a plain string", () => {
		expect(IdObjectSchema.match("550e8400-e29b-41d4-a716-446655440000")).toBe(
			false,
		);
	});
});
