import { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { describe, expect, it } from "bun:test";
import { customRecordVO } from "./custom";
import { entityOf } from "@/domain/entity/helpers";
import type { RawContextOf } from "@/domain/entity/types";
import { buildSchema } from "./helpers/schema-cache";
import { StringVO } from "./string.value-object";
import { SchemaVO } from "./schema.value-object";

const context = { name: "shape", source: "spec" } as const;

const wire = SchemaManager.serialize(t.Object({ author: t.String() }));

describe("SchemaVO", () => {
	it("wraps a serialized TypeBox schema", () => {
		expect(new SchemaVO(wire, context).value).toBe(wire);
	});

	it("rejects a string that is not JSON", () => {
		expect(() => new SchemaVO("not json", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects JSON that parses but is not a compilable schema", () => {
		expect(() => new SchemaVO('{"type":"banana"}', context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects a non-string value", () => {
		expect(() => new SchemaVO(42 as unknown as string, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demo() falls back to "{}", the accept-everything schema', () => {
		const demo = SchemaVO.demo(context);

		expect(demo.value).toBe("{}");
		expect(SchemaVO.match(demo, { anything: true })).toBe(true);
	});

	describe("from()", () => {
		it("serializes a live schema on the way in", () => {
			expect(
				SchemaVO.from(t.Object({ author: t.String() }), context).value,
			).toBe(wire);
		});

		it("round-trips through match()", () => {
			const shape = SchemaVO.from(t.Object({ author: t.String() }), context);

			expect(SchemaVO.match(shape, { author: "Alan" })).toBe(true);
			expect(SchemaVO.match(shape, { author: 42 })).toBe(false);
		});
	});

	describe("match()", () => {
		it("accepts the stored schema as a value-object", () => {
			const shape = new SchemaVO(wire, context);

			expect(SchemaVO.match(shape, { author: "Alan" })).toBe(true);
			expect(SchemaVO.match(shape, {})).toBe(false);
		});

		it("accepts the stored schema as a raw wire string", () => {
			expect(SchemaVO.match(wire, { author: "Alan" })).toBe(true);
			expect(SchemaVO.match(wire, { author: 42 })).toBe(false);
		});

		it("throws on a wire string that is not a schema, rather than answering false", () => {
			expect(() => SchemaVO.match("not json", {})).toThrow(
				InvalidPropertyException,
			);
			expect(() => SchemaVO.match('{"type":"banana"}', {})).toThrow(
				InvalidPropertyException,
			);
		});

		it("preserves the underlying failure as `cause`", () => {
			try {
				SchemaVO.match("not json", {});
				throw new Error("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).cause).toBeInstanceOf(
					SyntaxError,
				);
			}
		});
	});

	describe("hydration cache", () => {
		it("returns the same schema object for the same wire string", () => {
			const first = buildSchema(wire, context);
			const second = buildSchema(wire, context);

			// The whole point: `SchemaManager` caches compiled validators by object
			// identity, so a stable object is what makes `match` cheap. Without the
			// memo, `SchemaManager.build` mints a fresh one every call.
			expect(first).toBe(second);
		});

		it("is warmed by constructing the value-object", () => {
			const fresh = SchemaManager.serialize(t.Object({ warmed: t.Boolean() }));
			const built = new SchemaVO(fresh, context);

			expect(buildSchema(built.value, context)).toBe(
				buildSchema(fresh, context),
			);
		});
	});

	describe("as a blueprint key", () => {
		class PostType extends entityOf(
			{ name: StringVO, shape: SchemaVO },
			"post-type",
		) {}

		const postProperties = { type: PostType, info: customRecordVO() };

		class Post extends entityOf(postProperties, "post") {
			public constructor(context: RawContextOf<typeof postProperties>) {
				super(context);

				if (!SchemaVO.match(this.type.shape, this.info))
					throw new InvalidPropertyException("info", "post");
			}
		}

		const review = new PostType({
			name: "Review",
			shape: SchemaManager.serialize(
				t.Object({ author: t.String(), score: t.Number() }),
			),
		});

		it("gates a runtime-shaped payload at construction", () => {
			expect(
				new Post({ type: review.toJSON(), info: { author: "Alan", score: 9 } })
					.info,
			).toEqual({ author: "Alan", score: 9 });

			expect(
				() => new Post({ type: review.toJSON(), info: { author: "Alan" } }),
			).toThrow(InvalidPropertyException);
		});

		it("describes the key as JSON in the derived schema, not as a free string", () => {
			const shape = review.schema.properties.shape;

			expect(shape.format).toBe("json");
			expect(shape.description).toBe("A JSON-serialized TypeBox schema.");
		});

		it("round-trips the whole aggregate through fromJSON", () => {
			const post = new Post({
				type: review.toJSON(),
				info: { author: "Alan", score: 9 },
			});
			const raw = JSON.parse(JSON.stringify(post.toJSON())) as Parameters<
				typeof Post.fromJSON
			>[0];

			expect(Post.fromJSON(raw).toJSON()).toEqual(post.toJSON());
		});

		it("rejects an entity whose schema key is not a schema", () => {
			expect(
				() => new PostType({ name: "Broken", shape: '{"type":"banana"}' }),
			).toThrow(InvalidPropertyException);
		});
	});
});
