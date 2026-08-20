import {
	NumberSchema,
	SlugSchema,
	StringSchema,
} from "@/domain/collections/schemas";
import { unionVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { metaOf } from "@/domain/value-object/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "document", source: "user" } as const;

const Document = unionVO([StringSchema, NumberSchema], { default: "" });

const documentProperties = { document: Document };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Holder extends AccessorsOf<typeof documentProperties> {}
class Holder extends Entity<typeof documentProperties> {
	protected defineEntity(): EntityDefinition<typeof documentProperties> {
		return { properties: documentProperties, source: "holder" };
	}
}

describe("unionVO", () => {
	it("accepts a value matching the first member", () => {
		expect(new Document("123.456.789-00", context).value).toBe(
			"123.456.789-00",
		);
	});

	it("accepts a value matching a later member", () => {
		expect(new Document(12_345_678_900, context).value).toBe(12_345_678_900);
	});

	it("rejects a value matching no member at all", () => {
		expect(() => new Document(true as unknown as string, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects a value failing every member's own constraints", () => {
		const Reference = unionVO([SlugSchema, NumberSchema], { default: "slug" });

		expect(() => new Reference("Not A Slug", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("uses the declared default in demo mode", () => {
		expect(
			unionVO([StringSchema, NumberSchema], { default: 7 }).demo(context).value,
		).toBe(7);
	});

	it("rejects a default that passes no member, at factory-call time", () => {
		expect(() =>
			unionVO([SlugSchema, NumberSchema], { default: "Not A Slug" }),
		).toThrow(InvalidEntityDefinitionException);
	});

	it("builds a union carrying the given schemas by reference", () => {
		const schema = metaOf<
			string | number,
			t.TUnion<[typeof StringSchema, typeof NumberSchema]>
		>(Document).schema;

		expect(schema.anyOf[0]).toBe(StringSchema);
		expect(schema.anyOf[1]).toBe(NumberSchema);
	});

	it("round-trips through an entity, for either member", () => {
		for (const value of ["123.456.789-00", 12_345_678_900]) {
			const holder = new Holder({ document: value });
			const raw = JSON.parse(JSON.stringify(holder.toJSON()));

			expect(Holder.fromJSON(raw).document).toBe(value);
		}
	});

	it("makes the blueprint key omittable when `t.Undefined()` is a member", () => {
		const Optionalish = unionVO([StringSchema, t.Undefined()], {
			default: undefined,
		});

		const optionalProperties = { note: Optionalish };

		class Note extends Entity<typeof optionalProperties> {
			protected defineEntity(): EntityDefinition<typeof optionalProperties> {
				return { properties: optionalProperties, source: "note" };
			}
		}

		expect(new Note({}).get("note")).toBeUndefined();
	});
});
