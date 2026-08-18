import { SlugSchema, UuidSchema } from "@/domain/collections/schemas";
import { customArrayVO } from "@/domain/collections/value-objects/custom";
import { generateUUID } from "@/domain/entity/helpers";
import { metaOf } from "@/domain/value-object/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "authors", source: "post" } as const;

describe("customArrayVO", () => {
	it("validates every element against the item schema", () => {
		const Slugs = customArrayVO(SlugSchema);

		expect(new Slugs(["one", "two"], context).value).toEqual(["one", "two"]);
		expect(() => new Slugs(["ok", "Not A Slug"], context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("works with an item schema relying on a custom format", () => {
		const Ids = customArrayVO(UuidSchema);
		const id = generateUUID();

		expect(new Ids([id], context).value).toEqual([id]);
		expect(() => new Ids(["not-a-uuid"], context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("defaults to the empty array", () => {
		expect(customArrayVO(SlugSchema).demo(context).value).toEqual([]);
	});

	it("rejects the empty placeholder under `minItems`, at factory time", () => {
		expect(() =>
			customArrayVO(SlugSchema, { options: { minItems: 1 } }),
		).toThrow(InvalidEntityDefinitionException);
	});

	it("accepts a thunk default, evaluated only in demo mode", () => {
		let calls = 0;

		const Ids = customArrayVO(UuidSchema, {
			default: () => {
				calls += 1;
				return [generateUUID()];
			},
			options: { minItems: 1 },
		});

		expect(calls).toBe(0);
		expect(Ids.demo(context).value).toHaveLength(1);
		expect(calls).toBe(1);
	});

	it("enforces the array options", () => {
		const Tags = customArrayVO(SlugSchema, {
			default: ["tag"],
			options: { maxItems: 2, minItems: 1, uniqueItems: true },
		});

		expect(new Tags(["a", "b"], context).value).toEqual(["a", "b"]);
		expect(() => new Tags([], context)).toThrow(InvalidPropertyException);
		expect(() => new Tags(["a", "b", "c"], context)).toThrow(
			InvalidPropertyException,
		);
		expect(() => new Tags(["a", "a"], context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("carries the item schema and options into the built schema", () => {
		const Tags = customArrayVO(SlugSchema, {
			default: ["tag"],
			options: { minItems: 1 },
		});
		const schema = metaOf<string[], t.TArray<typeof SlugSchema>>(Tags).schema;

		expect(schema.items).toBe(SlugSchema);
		expect(schema.minItems).toBe(1);
	});

	it("transforms the array before validating it", () => {
		const Tags = customArrayVO(SlugSchema, {
			transform: (value) => value.map((tag) => tag.toLowerCase()),
		});

		expect(new Tags(["ONE", "TWO"], context).value).toEqual(["one", "two"]);
	});
});
