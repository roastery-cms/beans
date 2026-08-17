import { SlugSchema, StringSchema } from "@/collections/schemas";
import { StringVO } from "@/collections/value-objects";
import { nullableVO } from "@/collections/value-objects/custom";
import { Entity } from "@/entity";
import type { AccessorsOf, EntityDefinition } from "@/entity/types";
import { metaOf } from "@/value-object/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "subtitle", source: "post" } as const;

describe("nullableVO", () => {
	it("accepts `null` without throwing", () => {
		const NullableBio = nullableVO(StringSchema);

		expect(new NullableBio(null, context).value).toBeNull();
	});

	it("accepts a value that passes the wrapped schema", () => {
		const NullableBio = nullableVO(StringSchema);

		expect(new NullableBio("Alan", context).value).toBe("Alan");
	});

	it("rejects a value that is neither `null` nor schema-valid", () => {
		const NullableSlug = nullableVO(SlugSchema);

		expect(() => new NullableSlug("Not A Slug", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects `undefined` — only `null` is a valid empty value here", () => {
		const NullableBio = nullableVO(StringSchema);

		expect(
			() => new NullableBio(undefined as unknown as string | null, context),
		).toThrow(InvalidPropertyException);
	});

	it("defaults to `null` when no default is given", () => {
		expect(nullableVO(StringSchema).demo(context).value).toBeNull();
	});

	it("uses an explicit default in demo mode", () => {
		const NullableBio = nullableVO(StringSchema, { default: "anonymous" });

		expect(NullableBio.demo(context).value).toBe("anonymous");
	});

	it("wraps the given schema in a union with `t.Null()`", () => {
		const NullableBio = nullableVO(StringSchema);
		const schema = metaOf<
			string | null,
			t.TUnion<[typeof StringSchema, t.TNull]>
		>(NullableBio).schema;

		expect(schema.anyOf[0]).toBe(StringSchema);
		expect(schema.anyOf[1]?.type).toBe("null");
	});

	it("runs the transform and validate hooks over a real value", () => {
		const NullableBio = nullableVO(StringSchema, {
			transform: (value) => (value ? value.trim() : value),
			validate: (value) => value !== "banned",
		});

		expect(new NullableBio("  Alan  ", context).value).toBe("Alan");
		expect(() => new NullableBio("banned", context)).toThrow(
			InvalidPropertyException,
		);
	});
});

const NullableSubtitle = nullableVO(StringSchema, { name: "NullableSubtitle" });

const postProperties = { subtitle: NullableSubtitle };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("nullableVO in a blueprint", () => {
	it("accepts a real value through the typed accessor", () => {
		expect(new Post({ subtitle: "A subtitle" }).subtitle).toBe("A subtitle");
	});

	it("requires the key to be named — `null` must be explicit, not omitted", () => {
		// Unlike `optionalVO`, `subtitle` here is typed `subtitle: string | null`,
		// not `subtitle?: string | null` — `null` never extends `undefined`, so
		// `UndefinedableKeys` does not pick this key up. `new Post({})` is a
		// compile error; the key has to be named, even if the value is `null`.
		expect(new Post({ subtitle: null }).subtitle).toBeNull();
	});

	it("round-trips through toJSON and fromJSON", () => {
		const row = new Post({ subtitle: "A subtitle" }).toJSON();

		expect(Post.fromJSON(row).subtitle).toBe("A subtitle");
	});

	it("uses `null` in demo mode", () => {
		expect(Post.demo().subtitle).toBeNull();
	});
});

const authorProperties = { bio: NullableSubtitle, name: StringVO };

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

describe("nullableVO in a nested entity", () => {
	it("still requires the nested key to be named explicitly", () => {
		const article = new Article({ author: { bio: null, name: "Alan" } });

		expect(article.author.bio).toBeNull();
		expect(article.author.name).toBe("Alan");
	});
});
