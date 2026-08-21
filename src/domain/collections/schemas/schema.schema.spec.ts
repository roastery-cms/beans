import { SchemaManager } from "@roastery/terroir/schema";
import { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";
import { SchemaSchema } from "./schema.schema";

describe("SchemaSchema", () => {
	it("accepts a serialized TypeBox schema", () => {
		const wire = SchemaManager.serialize(t.Object({ author: t.String() }));

		expect(SchemaManager.match(SchemaSchema, wire)).toBe(true);
	});

	it("rejects a string that is not JSON", () => {
		expect(SchemaManager.match(SchemaSchema, "not json")).toBe(false);
	});

	it("rejects a non-string value", () => {
		expect(SchemaManager.match(SchemaSchema, 42)).toBe(false);
	});

	it("accepts JSON that is not a schema — that is SchemaVO's job", () => {
		expect(SchemaManager.match(SchemaSchema, '{"type":"banana"}')).toBe(true);
	});
});
