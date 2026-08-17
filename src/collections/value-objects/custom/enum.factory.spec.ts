import { customEnumVO } from "@/collections/value-objects/custom";
import { Entity } from "@/entity";
import type { AccessorsOf, EntityDefinition } from "@/entity/types";
import { metaOf } from "@/value-object/helpers";
import {
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "status", source: "post" } as const;

type Status = "archived" | "draft" | "published";

describe("customEnumVO", () => {
	it("accepts any value from the declared set", () => {
		const PostStatus = customEnumVO(["draft", "published", "archived"]);

		expect(new PostStatus("published", context).value).toBe("published");
	});

	it("rejects a value outside the declared set", () => {
		const PostStatus = customEnumVO(["draft", "published", "archived"]);

		expect(() => new PostStatus("deleted" as Status, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("defaults to the first declared value", () => {
		const PostStatus = customEnumVO(["draft", "published", "archived"]);

		expect(PostStatus.demo(context).value).toBe("draft");
	});

	it("rejects an explicit default outside the declared set, at factory time", () => {
		expect(() =>
			customEnumVO(["draft", "published"], {
				default: "archived" as "draft" | "published",
			}),
		).toThrow(InvalidEntityDefinitionException);
	});

	it("builds a genuine TypeBox enum schema, not a hand-rolled union", () => {
		const PostStatus = customEnumVO(["draft", "published", "archived"]);
		const schema = metaOf<Status, t.TEnum<Record<string, Status>>>(
			PostStatus,
		).schema;

		expect(schema[t.Hint]).toBe("Enum");
		expect(schema.anyOf.map((literal) => literal.const)).toEqual([
			"draft",
			"published",
			"archived",
		]);
	});

	it("works with numeric values", () => {
		const Priority = customEnumVO([1, 2, 3]);

		expect(new Priority(2, { name: "priority", source: "post" }).value).toBe(2);
		expect(
			() => new Priority(9 as 1 | 2 | 3, { name: "priority", source: "post" }),
		).toThrow(InvalidPropertyException);
		expect(Priority.demo({ name: "priority", source: "post" }).value).toBe(1);
	});

	it("runs the transform and validate hooks", () => {
		const PostStatus = customEnumVO(["draft", "published", "archived"], {
			validate: (value) => value !== "archived",
		});

		expect(new PostStatus("draft", context).value).toBe("draft");
		expect(() => new PostStatus("archived", context)).toThrow(
			InvalidPropertyException,
		);
	});
});

// No `as const` here — the `const` type parameter on `customEnumVO` infers
// the literal tuple on its own, and this line is the type-level proof: if it
// stopped working, `status` below would widen to `string` and the accessor
// assertions would fail to compile.
const PostStatus = customEnumVO(["draft", "published", "archived"], {
	default: "draft",
	name: "PostStatus",
});

const postProperties = { status: PostStatus };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("customEnumVO in a blueprint", () => {
	it("reads the value back through the typed accessor", () => {
		expect(new Post({ status: "published" }).status).toBe("published");
	});

	it("round-trips through toJSON and fromJSON", () => {
		const row = new Post({ status: "archived" }).toJSON();

		expect(Post.fromJSON(row).status).toBe("archived");
	});

	it("uses the factory's default in demo mode", () => {
		expect(Post.demo().status).toBe("draft");
	});

	it("validates through the aggregate schema on fromJSON", () => {
		const row = Post.demo().toJSON();

		expect(() => Post.fromJSON({ ...row, status: "deleted" } as never)).toThrow(
			InvalidDomainDataException,
		);
	});
});
