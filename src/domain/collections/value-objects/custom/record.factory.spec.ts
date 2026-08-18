import { customRecordVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";

const context = { name: "metadata", source: "post" } as const;

describe("customRecordVO", () => {
	it("accepts any string-keyed bag", () => {
		const Metadata = customRecordVO();

		expect(new Metadata({ featured: true, weight: 3 }, context).value).toEqual({
			featured: true,
			weight: 3,
		});
	});

	it("defaults to the empty record", () => {
		expect(customRecordVO().demo(context).value).toEqual({});
	});

	it("rejects a non-object value", () => {
		const Metadata = customRecordVO();

		expect(
			() =>
				new Metadata(
					"not an object" as unknown as Record<string, unknown>,
					context,
				),
		).toThrow(InvalidPropertyException);
	});

	it("enforces the object options it is given", () => {
		const Metadata = customRecordVO({
			default: { seed: true },
			options: { minProperties: 1 },
		});

		expect(new Metadata({ any: 1 }, context).value).toEqual({ any: 1 });
		expect(() => new Metadata({}, context)).toThrow(InvalidPropertyException);
	});

	it("rejects the empty placeholder under `minProperties`, at factory time", () => {
		expect(() => customRecordVO({ options: { minProperties: 1 } })).toThrow(
			InvalidEntityDefinitionException,
		);
	});

	it("runs the validate hook over the record", () => {
		const Metadata = customRecordVO({
			validate: (value) => !Object.hasOwn(value, "secret"),
		});

		expect(new Metadata({ public: 1 }, context).value).toEqual({ public: 1 });
		expect(() => new Metadata({ secret: 1 }, context)).toThrow(
			InvalidPropertyException,
		);
	});
});

const Metadata = customRecordVO({ name: "Metadata" });

const postProperties = { metadata: Metadata };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("customRecordVO in a blueprint", () => {
	it("reads the bag back through the typed accessor", () => {
		expect(new Post({ metadata: { featured: true } }).metadata).toEqual({
			featured: true,
		});
	});

	it("round-trips through toJSON and fromJSON", () => {
		const row = new Post({ metadata: { weight: 3 } }).toJSON();

		expect(Post.fromJSON(row).metadata).toEqual({ weight: 3 });
	});

	it("uses the empty record in demo mode", () => {
		expect(Post.demo().metadata).toEqual({});
	});
});
