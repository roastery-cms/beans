import { customStringVO } from "@/collections/value-objects/custom";
import { Entity } from "@/entity";
import type { AccessorsOf, EntityDefinition } from "@/entity/types";
import { metaOf } from "@/value-object/helpers";
import {
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "title", source: "post" } as const;

describe("customStringVO", () => {
	it("enforces the declared length constraints", () => {
		const Title = customStringVO({
			default: "title",
			options: { maxLength: 8, minLength: 4 },
		});

		expect(new Title("cool", context).value).toBe("cool");
		expect(() => new Title("no", context)).toThrow(InvalidPropertyException);
		expect(() => new Title("way too long", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("accepts an exact length, as `minLength` and `maxLength` together", () => {
		const Code = customStringVO({
			default: "abcd",
			options: { maxLength: 4, minLength: 4 },
		});

		expect(new Code("beef", context).value).toBe("beef");
		expect(() => new Code("bee", context)).toThrow(InvalidPropertyException);
	});

	it('defaults to the `"string"` placeholder', () => {
		expect(customStringVO().demo(context).value).toBe("string");
	});

	it("rejects the placeholder when the options refuse it, at factory time", () => {
		expect(() => customStringVO({ options: { minLength: 8 } })).toThrow(
			InvalidEntityDefinitionException,
		);
	});

	it("carries the options into the schema", () => {
		const Title = customStringVO({
			default: "title",
			options: { minLength: 4 },
		});

		expect(metaOf<string, t.TString>(Title).schema.minLength).toBe(4);
	});

	it("validates against the registered custom formats", () => {
		const Slug = customStringVO({
			default: "slug",
			options: { format: "slug" },
		});

		expect(new Slug("my-cool-post", context).value).toBe("my-cool-post");
		expect(() => new Slug("Not A Slug", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("combines a transform with the constraints", () => {
		const Slug = customStringVO({
			default: "slug",
			options: { format: "slug" },
			transform: (value) => value.trim().toLowerCase().replaceAll(" ", "-"),
		});

		expect(new Slug("  My Cool Post ", context).value).toBe("my-cool-post");
	});
});

const PostTitle = customStringVO({
	default: "untitled",
	name: "PostTitle",
	options: { maxLength: 120, minLength: 4 },
});

const postProperties = { title: PostTitle };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("customStringVO in a blueprint", () => {
	it("builds and reads back through the typed accessor", () => {
		expect(new Post({ title: "A Cool Post" }).title).toBe("A Cool Post");
	});

	it("rejects a value the factory's options refuse", () => {
		expect(() => new Post({ title: "no" })).toThrow(InvalidPropertyException);
	});

	it("names the failing property and the owning entity", () => {
		try {
			new Post({ title: "no" });
			throw new Error("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe("title");
			expect((error as InvalidPropertyException).source).toBe("post");
		}
	});

	it("uses the factory's default in demo mode", () => {
		expect(Post.demo().title).toBe("untitled");
	});

	it("embeds the factory's schema in the aggregate model", () => {
		expect(Post.demo().schema.properties.title.minLength).toBe(4);
		expect(Post.demo().schema.properties.title.maxLength).toBe(120);
	});

	it("shares one memoised model across instances", () => {
		expect(Post.demo().schema).toBe(Post.demo().schema);
	});

	it("validates through the aggregate schema on fromJSON", () => {
		const row = Post.demo().toJSON();

		expect(Post.fromJSON(row).title).toBe("untitled");
		expect(() => Post.fromJSON({ ...row, title: "no" })).toThrow(
			InvalidDomainDataException,
		);
	});
});
