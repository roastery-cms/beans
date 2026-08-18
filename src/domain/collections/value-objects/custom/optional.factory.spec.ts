import { SlugSchema, StringSchema } from "@/domain/collections/schemas";
import { optionalVO } from "@/domain/collections/value-objects/custom";
import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { metaOf } from "@/domain/value-object/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "subtitle", source: "post" } as const;

describe("optionalVO", () => {
	it("accepts `undefined` without throwing", () => {
		const OptionalBio = optionalVO(StringSchema);

		expect(new OptionalBio(undefined, context).value).toBeUndefined();
	});

	it("accepts a value that passes the wrapped schema", () => {
		const OptionalBio = optionalVO(StringSchema);

		expect(new OptionalBio("Alan", context).value).toBe("Alan");
	});

	it("rejects a value that is neither `undefined` nor schema-valid", () => {
		const OptionalSlug = optionalVO(SlugSchema);

		expect(() => new OptionalSlug("Not A Slug", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("defaults to `undefined` when no default is given", () => {
		expect(optionalVO(StringSchema).demo(context).value).toBeUndefined();
	});

	it("uses an explicit default in demo mode", () => {
		const OptionalBio = optionalVO(StringSchema, { default: "anonymous" });

		expect(OptionalBio.demo(context).value).toBe("anonymous");
	});

	it("wraps the given schema in a union with `t.Undefined()`", () => {
		const OptionalBio = optionalVO(StringSchema);
		const schema = metaOf<
			string | undefined,
			t.TUnion<[typeof StringSchema, t.TUndefined]>
		>(OptionalBio).schema;

		expect(schema.anyOf[0]).toBe(StringSchema);
		expect(schema.anyOf[1]?.type).toBe("undefined");
	});

	it("runs the transform and validate hooks over a real value", () => {
		const OptionalBio = optionalVO(StringSchema, {
			transform: (value) => (value ? value.trim() : value),
			validate: (value) => value !== "banned",
		});

		expect(new OptionalBio("  Alan  ", context).value).toBe("Alan");
		expect(() => new OptionalBio("banned", context)).toThrow(
			InvalidPropertyException,
		);
	});
});

const OptionalSubtitle = optionalVO(StringSchema, { name: "OptionalSubtitle" });

const postProperties = { subtitle: OptionalSubtitle };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("optionalVO in a blueprint", () => {
	it("accepts a real value through the typed accessor", () => {
		expect(new Post({ subtitle: "A subtitle" }).subtitle).toBe("A subtitle");
	});

	it("accepts an explicit `undefined` through the typed accessor", () => {
		expect(new Post({ subtitle: undefined }).subtitle).toBeUndefined();
	});

	it("makes the key itself optional — no need to pass `undefined` explicitly", () => {
		// No cast here: `subtitle` is typed `subtitle?: string`, not
		// `subtitle: string | undefined`, so the empty payload compiles on its own.
		expect(new Post({}).subtitle).toBeUndefined();
	});

	it("round-trips through toJSON and fromJSON", () => {
		const row = new Post({ subtitle: "A subtitle" }).toJSON();

		expect(Post.fromJSON(row).subtitle).toBe("A subtitle");
	});

	it("uses `undefined` in demo mode", () => {
		expect(Post.demo().subtitle).toBeUndefined();
	});
});

const authorProperties = { bio: OptionalSubtitle, name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Author extends AccessorsOf<typeof authorProperties> {}
class Author extends Entity<typeof authorProperties> {
	protected defineEntity(): EntityDefinition<typeof authorProperties> {
		return { properties: authorProperties, source: "author" };
	}
}

const articleProperties = { author: Author };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Article extends AccessorsOf<typeof articleProperties> {}
class Article extends Entity<typeof articleProperties> {
	protected defineEntity(): EntityDefinition<typeof articleProperties> {
		return { properties: articleProperties, source: "article" };
	}
}

describe("optionalVO in a nested entity", () => {
	it("lets the nested entity's own optional property be omitted too", () => {
		// No cast here either: `bio` is optional on the nested payload because
		// `Author`'s own blueprint already lets it be `undefined`.
		const article = new Article({ author: { name: "Alan" } });

		expect(article.author.bio).toBeUndefined();
		expect(article.author.name).toBe("Alan");
	});
});
