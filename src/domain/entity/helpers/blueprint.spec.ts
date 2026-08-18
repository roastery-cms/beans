import {
	BooleanVO,
	StringVO,
	SlugVO,
} from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type {
	AccessorsOf,
	EntityDefinition,
	RulesOf,
	SerializedEntity,
} from "@/domain/entity/types";
import {
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { Rules } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";

/** Domain vocabulary: aliases that inherit `defineMeta` and `transform`. */
class TagName extends StringVO {}
class TagSlug extends SlugVO {}
class TagVisibility extends BooleanVO {}

const postTagProperties = blueprint({
	name: TagName,
	slug: TagSlug,
	hidden: TagVisibility,
}).with({
	slug: { derive: (raw) => raw.name },
	hidden: { default: false },
});

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface PostTag extends AccessorsOf<typeof postTagProperties> {}
class PostTag extends Entity<typeof postTagProperties> {
	protected defineEntity(): EntityDefinition<typeof postTagProperties> {
		return { properties: postTagProperties, source: "post-tag" };
	}
}

/** Derivation that reads a sibling filled in by `default`. */
const bannerProperties = blueprint({
	title: StringVO,
	prefix: StringVO,
	label: StringVO,
}).with({
	prefix: { default: "tag" },
	label: { derive: (raw) => `${raw.prefix}: ${raw.title}` },
});

class Banner extends Entity<typeof bannerProperties> {
	protected defineEntity(): EntityDefinition<typeof bannerProperties> {
		return { properties: bannerProperties, source: "banner" };
	}
}

/** Chained derivations, in blueprint order. */
const routeProperties = blueprint({
	name: StringVO,
	slug: SlugVO,
	path: StringVO,
}).with({
	slug: { derive: (raw) => raw.name },
	path: { derive: (raw) => `/tags/${raw.slug}` },
});

class Route extends Entity<typeof routeProperties> {
	protected defineEntity(): EntityDefinition<typeof routeProperties> {
		return { properties: routeProperties, source: "route" };
	}
}

/** Rule-less blueprint — the path that already existed before. */
const plainProperties = { label: StringVO };

class Plain extends Entity<typeof plainProperties> {
	protected defineEntity(): EntityDefinition<typeof plainProperties> {
		return { properties: plainProperties, source: "plain" };
	}
}

const IDENTITY = {
	id: "0195c8e4-1f6d-7c2a-9d3b-5e8f7a1b2c3d",
	createdAt: "2026-01-15T10:30:00.000Z",
} as const;

describe("blueprint", () => {
	describe("declaration", () => {
		it("keeps the rules out of the blueprint's own keys", () => {
			expect(Object.keys(postTagProperties)).toEqual([
				"name",
				"slug",
				"hidden",
			]);
		});

		it("rejects a rule naming a property outside the blueprint", () => {
			const rules = { nope: { default: true } } as unknown as RulesOf<
				typeof plainProperties
			>;

			expect(() => blueprint(plainProperties).with(rules)).toThrow(
				InvalidEntityDefinitionException,
			);
		});

		it("rejects a rule declaring both default and derive", () => {
			const rules = {
				label: { default: "x", derive: () => "y" },
			} as unknown as RulesOf<typeof plainProperties>;

			expect(() => blueprint(plainProperties).with(rules)).toThrow(
				InvalidEntityDefinitionException,
			);
		});
	});

	describe("construction", () => {
		it("fills a ruled property the payload omits", () => {
			const tag = new PostTag({ name: "Alan Reis" });

			expect(tag.name).toBe("Alan Reis");
			expect(tag.slug).toBe("alan-reis");
			expect(tag.hidden).toBe(false);
		});

		it("lets an explicit value win over the rule", () => {
			const tag = new PostTag({
				name: "Alan Reis",
				slug: "custom-slug",
				hidden: true,
			});

			expect(tag.slug).toBe("custom-slug");
			expect(tag.hidden).toBe(true);
		});

		it("lets an explicit falsy value win over the rule", () => {
			const visible = new PostTag({ name: "Alan Reis", hidden: false });

			expect(visible.hidden).toBe(false);
		});

		it("overrides the value-object's own default with the entity's", () => {
			expect(
				TagVisibility.demo({ name: "hidden", source: "post-tag" }).value,
			).toBe(true);
			expect(new PostTag({ name: "Alan Reis" }).hidden).toBe(false);
		});

		it("derives from a sibling filled by a default", () => {
			const banner = new Banner({ title: "Launch" });

			expect(banner.get("prefix")).toBe("tag");
			expect(banner.get("label")).toBe("tag: Launch");
		});

		it("chains derivations in blueprint order, over normalised values", () => {
			const route = new Route({ name: "Alan Reis" });

			expect(route.get("slug")).toBe("alan-reis");
			expect(route.get("path")).toBe("/tags/alan-reis");
		});

		it("still runs the property's own transform over a derived value", () => {
			expect(new PostTag({ name: "My Cool Tag" }).slug).toBe("my-cool-tag");
		});

		it("preserves a given identity", () => {
			const tag = new PostTag({ name: "Alan Reis", ...IDENTITY });

			expect(tag.id).toBe(IDENTITY.id);
			expect(tag.createdAt).toBe(IDENTITY.createdAt);
		});

		it("rejects a derived value the property refuses", () => {
			const brokenProperties = blueprint({
				name: StringVO,
				slug: SlugVO,
			}).with({ slug: { derive: () => "" } });

			class Broken extends Entity<typeof brokenProperties> {
				protected defineEntity(): EntityDefinition<typeof brokenProperties> {
					return { properties: brokenProperties, source: "broken" };
				}
			}

			expect(() => new Broken({ name: "Alan" })).toThrow(
				InvalidPropertyException,
			);
		});
	});

	describe("demo", () => {
		it("applies the entity's default instead of the value-object's", () => {
			expect(PostTag.demo().hidden).toBe(false);
		});

		it("derives from the demo values of the siblings", () => {
			const tag = PostTag.demo();

			expect(tag.name).toBe("string");
			expect(tag.slug).toBe("string");
		});

		it("keeps unruled properties on their own demo default", () => {
			expect(Plain.demo().get("label")).toBe("string");
		});

		it("stamps a fresh identity", () => {
			expect(PostTag.demo().id).not.toBe(PostTag.demo().id);
		});
	});

	describe("serialization", () => {
		it("emits every property, rules included", () => {
			const tag = new PostTag({ name: "Alan Reis", ...IDENTITY });

			expect(tag.toJSON()).toEqual({
				...IDENTITY,
				name: "Alan Reis",
				slug: "alan-reis",
				hidden: false,
			});
		});

		it("keeps every property required in the derived schema", () => {
			const { properties, required } = new PostTag({
				name: "Alan Reis",
			}).schema;

			expect(Object.keys(properties)).toEqual([
				"id",
				"createdAt",
				"updatedAt",
				"name",
				"slug",
				"hidden",
			]);
			expect([...(required as readonly string[])].sort()).toEqual([
				"createdAt",
				"hidden",
				"id",
				"name",
				"slug",
			]);
		});
	});

	describe("fromJSON", () => {
		it("hydrates a complete payload", () => {
			const tag = PostTag.fromJSON({
				...IDENTITY,
				name: "Alan Reis",
				slug: "alan-reis",
				hidden: false,
			});

			expect(tag.slug).toBe("alan-reis");
			expect(tag.id).toBe(IDENTITY.id);
		});

		it("stays strict: a ruled property missing is still rejected", () => {
			expect(() =>
				PostTag.fromJSON({
					...IDENTITY,
					name: "Alan Reis",
					hidden: false,
				} as unknown as SerializedEntity<typeof postTagProperties>),
			).toThrow(InvalidDomainDataException);
		});

		it("stays strict: an unknown key is still rejected", () => {
			expect(() =>
				PostTag.fromJSON({
					...IDENTITY,
					name: "Alan Reis",
					slug: "alan-reis",
					hidden: false,
					extra: "nope",
				} as unknown as SerializedEntity<typeof postTagProperties>),
			).toThrow(InvalidDomainDataException);
		});
	});

	describe("mutation", () => {
		it("does not re-fire a derivation when its source changes", () => {
			const tag = new PostTag({ name: "Alan Reis" });

			tag.set("name", "Outro Nome");

			expect(tag.name).toBe("Outro Nome");
			expect(tag.slug).toBe("alan-reis");
		});

		it("replaces a ruled property from an explicit value", () => {
			const tag = new PostTag({ name: "Alan Reis" });

			tag.set("slug", "Novo Slug");

			expect(tag.slug).toBe("novo-slug");
		});
	});

	describe("nested entities", () => {
		const postProperties = { title: StringVO, tag: PostTag };

		class Post extends Entity<typeof postProperties> {
			protected defineEntity(): EntityDefinition<typeof postProperties> {
				return { properties: postProperties, source: "post" };
			}
		}

		it("applies the nested entity's rules to its raw payload", () => {
			const post = new Post({ title: "Hello", tag: { name: "Alan Reis" } });

			expect(post.get("tag").slug).toBe("alan-reis");
			expect(post.get("tag").hidden).toBe(false);
		});

		it("applies them in demo mode too", () => {
			expect(Post.demo().get("tag").hidden).toBe(false);
		});

		it("still requires the nested properties no rule covers", () => {
			expect(
				// @ts-expect-error `name` has no rule, so it stays required when nested
				() => new Post({ title: "Hello", tag: {} }),
			).toThrow(InvalidPropertyException);
		});

		it("rebuilds through set with the rules applied", () => {
			const post = new Post({ title: "Hello", tag: { name: "Alan Reis" } });

			post.set("tag", { name: "Outra Tag" });

			expect(post.get("tag").slug).toBe("outra-tag");
		});

		describe("past the first nested level", () => {
			const blogProperties = { post: Post };

			class Blog extends Entity<typeof blogProperties> {
				protected defineEntity(): EntityDefinition<typeof blogProperties> {
					return { properties: blogProperties, source: "blog" };
				}
			}

			it("keeps the relaxations at every depth, not just the first", () => {
				// `NestedEntityInput` goes through the same `ConstructionValuesOf` as
				// the outer level, so "a complete payload" means the same thing at
				// any depth. Deriving from `ReturnType<toJSON>` only relaxed the
				// first level: the grandchild went back to requiring the identity
				// and the keys its own rules cover.
				const blog = new Blog({
					post: { title: "Hello", tag: { name: "Alan Reis" } },
				});

				expect(blog.get("post").get("tag").slug).toBe("alan-reis");
				expect(blog.get("post").get("tag").hidden).toBe(false);
			});

			it("still requires the grandchild's unruled properties", () => {
				expect(
					// @ts-expect-error `name` has no rule, and stays required on the grandchild
					() => new Blog({ post: { title: "Hello", tag: {} } }),
				).toThrow(InvalidPropertyException);
			});

			it("relaxes the grandchild through set too", () => {
				const blog = new Blog({
					post: { title: "Hello", tag: { name: "Alan" } },
				});

				blog.set("post", { title: "Oi", tag: { name: "Outra Tag" } });

				expect(blog.get("post").get("tag").slug).toBe("outra-tag");
			});
		});
	});

	describe("plain blueprints", () => {
		it("keeps every property required", () => {
			const untyped = Plain as unknown as {
				new (payload: Record<string, unknown>): Plain;
			};

			expect(() => new untyped({})).toThrow(InvalidPropertyException);
		});

		it("builds exactly as before when a value is given", () => {
			expect(new Plain({ label: "alan" }).get("label")).toBe("alan");
		});
	});

	describe("done", () => {
		it("returns the shape it was given, untouched", () => {
			const shape = { label: StringVO };

			expect(blueprint(shape).done()).toBe(shape);
		});

		it("attaches no rules slot, unlike with({})", () => {
			const closed = blueprint({ label: StringVO }).done();
			const empty = blueprint({ label: StringVO }).with({});

			expect(Object.getOwnPropertySymbols(closed)).toEqual([]);
			expect(Object.getOwnPropertySymbols(empty)).toEqual([Rules]);
		});

		it("behaves identically to a bare object literal", () => {
			const viaDone = blueprint({ label: StringVO }).done();

			class ViaDone extends entityOf(viaDone, "via-done") {}
			class ViaLiteral extends entityOf({ label: StringVO }, "via-literal") {}

			expect(new ViaDone({ label: "alan" }).label).toBe("alan");
			expect(Object.keys(new ViaDone({ label: "alan" }).toJSON())).toEqual(
				Object.keys(new ViaLiteral({ label: "alan" }).toJSON()),
			);
		});

		it("keeps every property required, since there are no rules to relax them", () => {
			class Closed extends entityOf(
				blueprint({ label: StringVO }).done(),
				"closed",
			) {}

			const untyped = Closed as unknown as {
				new (payload: Record<string, unknown>): Closed;
			};

			expect(() => new untyped({})).toThrow(InvalidPropertyException);
		});
	});
});
