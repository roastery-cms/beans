import { describe, expect, it } from "bun:test";

import {
	BooleanVO,
	IntegerVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { defineDomainEvent } from "@/domain/domain-event";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type { RawContextOf } from "@/domain/entity/types";
import { recordOf } from "@/domain/record";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";
import { arrayOf, nullableOf, optionalOf } from "./helpers";

const TagRenamed = defineDomainEvent("TagRenamed");

const tagProperties = blueprint({
	name: StringVO,
	slug: StringVO,
	hidden: BooleanVO,
}).with({
	hidden: { default: false },
	slug: {
		derive: (raw) => String(raw.name).toLowerCase().replace(/\s+/g, "-"),
	},
});

class Tag extends entityOf(tagProperties, "wrapper-tag") {
	public rename(value: string): void {
		this.set("name", value);
		this.raiseEvent(TagRenamed);
	}
}

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"wrapper-money",
) {
	public isFree(): boolean {
		return this.amount === 0;
	}
}

/** Invariant type equality — see `record-type-parity.spec.ts`. */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

function assertEqual<_T extends true>(): void {}

describe("multiplicity wrappers", () => {
	describe("arrayOf", () => {
		const postProperties = { title: StringVO, tags: arrayOf(Tag) };

		class Post extends entityOf(postProperties, "wrapper-post") {}

		it("builds each item through the wrapped class's own rules", () => {
			const post = new Post({
				title: "x",
				tags: [{ name: "Alan Reis" }, { name: "Second" }],
			});

			expect(post.tags).toHaveLength(2);
			expect(post.tags[0]?.slug).toBe("alan-reis");
			expect(post.tags[0]?.hidden).toBe(false);
			expect(post.tags[0]?.id).toBeString();
		});

		it("reads unwrapped, so the items' verbs stay reachable", () => {
			const post = new Post({ title: "x", tags: [{ name: "Alan" }] });

			post.tags[0]?.rename("Bob");

			expect(post.tags[0]?.name).toBe("Bob");
		});

		it("round-trips through toJSON / fromJSON", () => {
			const post = new Post({ title: "x", tags: [{ name: "Alan" }] });
			const raw = JSON.parse(JSON.stringify(post.toJSON())) as ReturnType<
				Post["toJSON"]
			>;

			const hydrated = Post.fromJSON(raw);

			expect(hydrated.tags[0]?.id).toBe(post.tags[0]?.id ?? "");
			expect(hydrated.toJSON()).toEqual(post.toJSON());
		});

		it("rejects a payload whose items are not complete, through fromJSON", () => {
			const post = new Post({ title: "x", tags: [{ name: "Alan" }] });
			const raw = post.toJSON() as unknown as Record<string, unknown>;

			expect(() =>
				Post.fromJSON({ ...raw, tags: [{ name: "Alan" }] } as never),
			).toThrow(InvalidDomainDataException);
		});

		it("demos to an empty list", () => {
			expect(Post.demo().tags).toEqual([]);
		});

		it("replaces the whole list through set, preserving ids passed back", () => {
			class MutablePost extends entityOf(postProperties, "wrapper-post-set") {
				public append(name: string): boolean {
					return this.set("tags", [
						...this.tags.map((tag) => tag.toJSON()),
						{ name },
					]);
				}
			}

			const post = new MutablePost({ title: "x", tags: [{ name: "Alan" }] });
			const first = post.tags[0]?.id;

			expect(post.append("Second")).toBe(true);
			expect(post.tags).toHaveLength(2);
			expect(post.tags[0]?.id).toBe(first ?? "");
		});

		it("reports no change when the same list is set again", () => {
			class MutablePost extends entityOf(postProperties, "wrapper-post-same") {
				public replace(raws: readonly unknown[]): boolean {
					return this.set("tags", raws as never);
				}
			}

			const post = new MutablePost({ title: "x", tags: [{ name: "Alan" }] });

			expect(post.replace(post.tags.map((tag) => tag.toJSON()))).toBe(false);
		});

		/**
		 * The one failure in this feature that would be entirely silent: an
		 * entity inside a list raises into its **own** buffer, so without the
		 * wrapper forwarding the deep drain its events would never come out.
		 */
		it("forwards a deep domain-event drain into every item", () => {
			const post = new Post({
				title: "x",
				tags: [{ name: "Alan" }, { name: "Bob" }],
			});

			post.tags[0]?.rename("First");
			post.tags[1]?.rename("Second");

			expect(post.pullDomainEvents()).toHaveLength(0);
			expect(post.pullDomainEvents({ deep: true })).toHaveLength(2);
			expect(post.pullDomainEvents({ deep: true })).toHaveLength(0);
		});

		it("derives a t.Array schema over the item's own model", () => {
			const model = new Post({ title: "x", tags: [] }).schema as unknown as {
				properties: { tags: { type: string; items: { type: string } } };
			};

			expect(model.properties.tags.type).toBe("array");
			expect(model.properties.tags.items.type).toBe("object");
		});

		it("rejects a payload that is not a list", () => {
			expect(() => new Post({ title: "x", tags: "nope" as never })).toThrow();
		});

		it("wraps a value-object and a record just as well", () => {
			const properties = {
				names: arrayOf(StringVO),
				prices: arrayOf(Money),
			};

			class Basket extends entityOf(properties, "wrapper-basket") {}

			const basket = new Basket({
				names: ["a", "b"],
				prices: [{ amount: 0, currency: "BRL" }],
			});

			expect(basket.names).toEqual(["a", "b"]);
			expect(basket.prices[0]?.isFree()).toBe(true);
			expect(Basket.demo().names).toEqual([]);
		});
	});

	describe("optionalOf", () => {
		const postProperties = { title: StringVO, author: optionalOf(Tag) };

		class Post extends entityOf(postProperties, "wrapper-optional-post") {}

		it("makes the key omittable and reads back undefined", () => {
			expect(new Post({ title: "x" }).author).toBeUndefined();
		});

		it("builds the value when one is given", () => {
			const post = new Post({ title: "x", author: { name: "Alan" } });

			expect(post.author?.name).toBe("Alan");
		});

		it("demos to nothing", () => {
			expect(Post.demo().author).toBeUndefined();
		});

		it("round-trips both states through a real JSON hop", () => {
			for (const post of [
				new Post({ title: "x" }),
				new Post({ title: "x", author: { name: "Alan" } }),
			]) {
				const raw = JSON.parse(JSON.stringify(post.toJSON())) as ReturnType<
					Post["toJSON"]
				>;

				expect(Post.fromJSON(raw).toJSON()).toEqual(post.toJSON());
			}
		});

		it("forwards a deep drain when it holds an entity", () => {
			const post = new Post({ title: "x", author: { name: "Alan" } });

			post.author?.rename("Bob");

			expect(post.pullDomainEvents({ deep: true })).toHaveLength(1);
		});

		it("derives a union with undefined", () => {
			const model = new Post({ title: "x" }).schema as unknown as {
				required: readonly string[];
			};

			expect(model.required).not.toContain("author");
		});
	});

	describe("nullableOf", () => {
		const postProperties = { title: StringVO, author: nullableOf(Tag) };

		class Post extends entityOf(postProperties, "wrapper-nullable-post") {}

		it("keeps the key required — null is stated, never omitted", () => {
			expect(new Post({ title: "x", author: null }).author).toBeNull();
		});

		it("demos to null", () => {
			expect(Post.demo().author).toBeNull();
		});

		it("round-trips null through a real JSON hop", () => {
			const post = new Post({ title: "x", author: null });
			const raw = JSON.parse(JSON.stringify(post.toJSON())) as ReturnType<
				Post["toJSON"]
			>;

			expect(Post.fromJSON(raw).toJSON()).toEqual(post.toJSON());
		});

		it("keeps the key in the schema's required list", () => {
			const model = new Post({ title: "x", author: null })
				.schema as unknown as { required: readonly string[] };

			expect(model.required).toContain("author");
		});
	});

	describe("inside a record", () => {
		const cartProperties = { items: arrayOf(Money) };

		class Cart extends recordOf(cartProperties, "wrapper-cart") {
			public total(): number {
				return this.items.reduce((sum, item) => sum + item.amount, 0);
			}
		}

		it("wraps and reads back unwrapped", () => {
			const cart = new Cart({
				items: [
					{ amount: 3, currency: "BRL" },
					{ amount: 4, currency: "BRL" },
				],
			});

			expect(cart.total()).toBe(7);
			expect(Cart.demo().items).toEqual([]);
		});

		it("carries no identity fields into the derived schema", () => {
			const model = new Cart({ items: [] }).schema as unknown as {
				properties: { items: { items: { required: readonly string[] } } };
			};

			expect(model.properties.items.items.required).not.toContain("id");
		});
	});

	describe("the payload types", () => {
		const postProperties = {
			title: StringVO,
			tags: arrayOf(Tag),
			author: optionalOf(Tag),
			editor: nullableOf(Tag),
		};

		it("makes only the optional key omittable", () => {
			type Payload = RawContextOf<typeof postProperties>;

			assertEqual<Equal<"author" extends keyof Payload ? true : false, true>>();

			// `undefined` reaches an omittable key and nothing else: a nullable
			// one is stated explicitly, and a list is always required.
			assertEqual<
				Equal<undefined extends Payload["author"] ? true : false, true>
			>();
			assertEqual<
				Equal<undefined extends Payload["editor"] ? true : false, false>
			>();
			assertEqual<
				Equal<undefined extends Payload["tags"] ? true : false, false>
			>();
			assertEqual<Equal<null extends Payload["editor"] ? true : false, true>>();
		});

		it("reads a list back as the instances themselves", () => {
			class Post extends entityOf(postProperties, "wrapper-types-post") {}

			const post = new Post({ title: "x", tags: [], editor: null });

			assertEqual<Equal<typeof post.tags, readonly Tag[]>>();
			assertEqual<Equal<typeof post.author, Tag | undefined>>();
			assertEqual<Equal<typeof post.editor, Tag | null>>();
		});
	});
});
