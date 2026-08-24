import { describe, expect, it } from "bun:test";
import {
	EmailVO,
	IntegerVO,
	SlugVO,
	StringVO,
	UuidVO,
} from "@/domain/collections/value-objects";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import { reshapeShape } from "@/domain/entity/helpers/reshape-shape";
import type {
	PropertiesShapeBase,
	ReshapeShapeBase,
	SerializedEntity,
} from "@/domain/entity/types";
import type { SerializedValuesOf } from "@/domain/entity/types/serialized-values-of.type";
import { recordOf } from "@/domain/record";
import { arrayOf, nullableOf, optionalOf } from "@/domain/wrapper/helpers";
import {
	CyclicEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { Properties, Source } from "@roastery/terroir/symbols";
import { reshapeTo } from "./reshape-to";

/** Domain vocabulary: adds nothing of its own, and must still satisfy `UuidVO`. */
class PostAuthorId extends UuidVO {}

// The source side: a fat aggregate carrying one of each blueprint kind.
class Author extends entityOf(
	{ name: StringVO, bio: StringVO, email: EmailVO },
	"reshape-author",
) {}
class PostTag extends entityOf(
	{ slug: SlugVO, label: StringVO },
	"reshape-tag",
) {}
class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"reshape-money",
) {}

const postProperties = {
	title: StringVO,
	body: StringVO,
	authorId: PostAuthorId,
	author: Author,
	price: Money,
	tags: arrayOf(PostTag),
	editor: optionalOf(Author),
	sponsor: nullableOf(Author),
} satisfies PropertiesShapeBase;

class Post extends entityOf(postProperties, "reshape-post") {}

/** One level deeper than `Post`, so a nested target can nest another. */
class Site extends entityOf({ name: StringVO, post: Post }, "reshape-site") {}

// The target side: narrower classes with no relationship whatsoever to the
// source's — the case that separates `reshapeTo` from `entityHas`.
class AuthorCard extends entityOf({ name: StringVO }, "reshape-author-card") {}
class TagCard extends entityOf({ slug: SlugVO }, "reshape-tag-card") {}
class AmountOnly extends recordOf({ amount: IntegerVO }, "reshape-amount") {}

function makePost(): Post {
	return new Post({
		title: "A Post",
		body: "…the whole body…",
		authorId: "0195e2a0-0000-7000-8000-000000000001",
		author: { name: "Ada", bio: "Countess", email: "ada@lovelace.dev" },
		price: { amount: 1200, currency: "BRL" },
		tags: [
			{ slug: "one", label: "One" },
			{ slug: "two", label: "Two" },
		],
		sponsor: null,
	});
}

function makeSite(): Site {
	return new Site({ name: "A Site", post: makePost().toJSON() });
}

/** Invariant type equality — see `record-type-parity.spec.ts`. */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

function assertEqual<_T extends true>(): void {}

describe("reshapeTo", () => {
	it("drops every key the target blueprint did not ask for", () => {
		const shape = blueprint({ title: StringVO }).done();

		expect(Object.keys(reshapeTo(shape, makePost())).sort()).toEqual([
			"createdAt",
			"id",
			"title",
		]);
	});

	it("leaves the source instance untouched", () => {
		const post = makePost();
		const before = post.toJSON();

		reshapeTo(blueprint({ title: StringVO }).done(), post);

		expect(post.toJSON()).toEqual(before);
	});

	it("carries the identity fields when the source is an entity", () => {
		const post = makePost();
		const raw = reshapeTo(blueprint({ title: StringVO }).done(), post);

		expect(raw.id).toBe(post.id);
		expect(raw.createdAt).toBe(post.toJSON().createdAt);
	});

	it("carries no identity when the source is a record — it has none to give", () => {
		const money = new Money({ amount: 1200, currency: "BRL" });
		const raw = reshapeTo(blueprint({ amount: IntegerVO }).done(), money);

		expect(raw).toEqual({ amount: 1200 });
	});

	it("accepts a domain-vocabulary subclass of the value-object asked for", () => {
		const raw = reshapeTo(blueprint({ authorId: UuidVO }).done(), makePost());

		expect(raw.authorId).toBe("0195e2a0-0000-7000-8000-000000000001");
	});

	/**
	 * The case `entityHas` cannot answer and this exists for: `AuthorCard` is
	 * not `Author`, shares no prototype chain with it, and is still a shape the
	 * source can be cut down to. Nested identity rides along, which is what
	 * makes the result feed `AuthorCard.fromJSON`.
	 */
	it("cuts a nested entity down to an unrelated target class", () => {
		const post = makePost();
		const raw = reshapeTo(blueprint({ author: AuthorCard }).done(), post);

		expect(Object.keys(raw.author).sort()).toEqual(["createdAt", "id", "name"]);
		expect(raw.author.name).toBe("Ada");
		expect(raw.author.id).toBe(post.author.id);
	});

	it("cuts a nested record, which brings no identity of its own", () => {
		const raw = reshapeTo(blueprint({ price: AmountOnly }).done(), makePost());

		expect(raw.price).toEqual({ amount: 1200 });
	});

	it("cuts every item of an array wrapper", () => {
		const raw = reshapeTo(
			blueprint({ tags: arrayOf(TagCard) }).done(),
			makePost(),
		);

		expect(raw.tags.map((tag) => tag.slug)).toEqual(["one", "two"]);
		expect(Object.keys(raw.tags[0] ?? {}).sort()).toEqual([
			"createdAt",
			"id",
			"slug",
		]);
	});

	/**
	 * Every `arrayOf(X)` call mints a fresh class, so the wrapper written here
	 * is never the one in the blueprint. Comparing by identity or by prototype
	 * chain would say no — the regression `entityHas` was fixed for.
	 */
	it("matches a wrapper minted fresh at the call site", () => {
		expect(() =>
			reshapeTo(blueprint({ tags: arrayOf(TagCard) }).done(), makePost()),
		).not.toThrow();
	});

	/**
	 * The same present-with-`undefined` `toJSON()` emits, which
	 * `SerializedValuesOf` types as optional for exactly this reason: a
	 * `JSON.stringify` round trip drops the key, so the payload that comes back
	 * is still one `fromJSON` accepts. Reshaping must not diverge from that.
	 */
	it("emits an empty optional key the way toJSON does, so it survives a round trip", () => {
		const raw = reshapeTo(
			blueprint({ editor: optionalOf(AuthorCard) }).done(),
			makePost(),
		);

		expect(raw.editor).toBeUndefined();
		expect(JSON.parse(JSON.stringify(raw))).not.toHaveProperty("editor");
	});

	it("preserves a nullable key's null instead of descending into it", () => {
		const raw = reshapeTo(
			blueprint({ sponsor: nullableOf(AuthorCard) }).done(),
			makePost(),
		);

		expect(raw.sponsor).toBeNull();
	});

	it("throws InvalidPropertyException naming a key the source does not declare", () => {
		const shape = blueprint({ subtitle: StringVO }).done();

		expect(() => reshapeTo(shape, makePost())).toThrow(
			InvalidPropertyException,
		);

		try {
			reshapeTo(shape, makePost());
		} catch (error) {
			expect((error as InvalidPropertyException).property).toBe("subtitle");
			expect((error as InvalidPropertyException).source).toBe("reshape-post");
		}
	});

	it("names the dotted path when the divergence is a level down", () => {
		class AuthorWithTwitter extends entityOf(
			{ name: StringVO, twitter: StringVO },
			"reshape-author-twitter",
		) {}

		try {
			reshapeTo(blueprint({ author: AuthorWithTwitter }).done(), makePost());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe(
				"author.twitter",
			);
		}
	});

	it("rejects a value-object that is neither the class asked for nor a subclass", () => {
		try {
			reshapeTo(blueprint({ title: SlugVO }).done(), makePost());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe("title");
		}
	});

	it("rejects a mismatched multiplicity — it is part of the shape", () => {
		try {
			reshapeTo(blueprint({ tags: optionalOf(TagCard) }).done(), makePost());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe("tags");
		}
	});

	it("rejects an unwrapped expectation against a wrapped key", () => {
		expect(() =>
			reshapeTo(blueprint({ tags: TagCard }).done(), makePost()),
		).toThrow(InvalidPropertyException);
	});

	/**
	 * Rules act on construction input; this reads an instance already built.
	 * A `default` therefore cannot stand in for a key the source never had.
	 */
	it("does not let a rule's default stand in for a key the source lacks", () => {
		const shape = blueprint({ subtitle: StringVO }).with({
			subtitle: { default: "untitled" },
		});

		expect(() => reshapeTo(shape, makePost())).toThrow(
			InvalidPropertyException,
		);
	});

	it("never leaks the Rules slot into the projection", () => {
		const shape = blueprint({ title: StringVO }).with({
			title: { default: "untitled" },
		});

		expect(Object.getOwnPropertySymbols(reshapeTo(shape, makePost()))).toEqual(
			[],
		);
	});

	/**
	 * The target blueprint comes from the caller and may never have been
	 * through `modelFor`, so its cycle is `reshapeTo`'s to catch. Reaching the
	 * guard needs a source that conforms all the way down, which a cyclic
	 * blueprint can never build an instance of — hence the stub, which carries
	 * exactly the three members `ReshapableModel` asks for.
	 */
	it("detects a cycle in the target blueprint", () => {
		const cyclic: PropertiesShapeBase = { title: StringVO };
		class Cyclic extends entityOf(cyclic, "reshape-cyclic") {}

		cyclic.self = Cyclic;

		const stub = {
			[Source]: "reshape-cyclic",
			[Properties]: cyclic,
			toJSON: () => ({}),
		};

		expect(() => reshapeTo(cyclic, stub)).toThrow(
			CyclicEntityDefinitionException,
		);
	});

	it("rejects anything that is not an entity or a record", () => {
		expect(() =>
			// biome-ignore lint/suspicious/noExplicitAny: the point is the runtime guard for JS callers.
			reshapeTo(blueprint({ title: StringVO }).done(), {} as any),
		).toThrow();
	});

	/** The intended use: a projection is a payload another aggregate can hydrate. */
	it("produces a payload the target entity's fromJSON accepts", () => {
		const author = makePost().author;
		const card = AuthorCard.fromJSON(
			reshapeTo(blueprint({ name: StringVO }).done(), author),
		);

		expect(card.name).toBe("Ada");
		expect(card.id).toBe(author.id);
	});

	/**
	 * The identity rule is a type-level promise as much as a runtime one, and
	 * the two have to agree: a record cannot be typed as carrying an `id` it
	 * will never be given. Asserted on `keyof` rather than on the whole shape,
	 * so it pins the rule itself and not `Optionalize`'s internals.
	 */
	it("types identity in for an entity source and out for a record one", () => {
		const entityShape = blueprint({ title: StringVO }).done();
		const recordShape = blueprint({ amount: IntegerVO }).done();

		type FromEntity = ReturnType<typeof reshapeTo<typeof entityShape, Post>>;
		type FromRecord = ReturnType<typeof reshapeTo<typeof recordShape, Money>>;

		assertEqual<Equal<FromEntity, SerializedEntity<typeof entityShape>>>();
		assertEqual<Equal<FromRecord, SerializedValuesOf<typeof recordShape>>>();

		// The rule itself, in both directions.
		assertEqual<Equal<"id" extends keyof FromEntity ? true : false, true>>();
		assertEqual<Equal<"id" extends keyof FromRecord ? true : false, false>>();
	});

	describe("a key nesting another target", () => {
		const nameOnly = reshapeShape({ name: StringVO });
		const slugOnly = reshapeShape({ slug: SlugVO });

		/**
		 * The point of nesting a target instead of naming a class: no throwaway
		 * `AuthorCard` subclass, and identity still rides along, so the result is
		 * still something `fromJSON` accepts.
		 */
		it("cuts an unwrapped nested entity, identity riding along", () => {
			const post = makePost();
			const raw = reshapeTo(reshapeShape({ author: nameOnly }), post);

			expect(Object.keys(raw.author).sort()).toEqual([
				"createdAt",
				"id",
				"name",
			]);
			expect(raw.author.name).toBe("Ada");
			expect(raw.author.id).toBe(post.author.id);
		});

		it("cuts a nested record, which brings no identity of its own", () => {
			const raw = reshapeTo(
				reshapeShape({ price: reshapeShape({ amount: IntegerVO }) }),
				makePost(),
			);

			expect(raw.price).toEqual({ amount: 1200 });
		});

		/**
		 * The multiplicity rule: a nested target says nothing about it, so the
		 * source's `arrayOf` is what makes this an array. A *class* target still
		 * has to match — see the mismatched-multiplicity case above.
		 */
		it("adopts an array source's multiplicity", () => {
			const raw = reshapeTo(reshapeShape({ tags: slugOnly }), makePost());

			expect(raw.tags.map((tag) => tag.slug)).toEqual(["one", "two"]);
			expect(Object.keys(raw.tags[0] ?? {}).sort()).toEqual([
				"createdAt",
				"id",
				"slug",
			]);
		});

		it("adopts an optional source's multiplicity, emitting it the way toJSON does", () => {
			const raw = reshapeTo(reshapeShape({ editor: nameOnly }), makePost());

			expect(raw.editor).toBeUndefined();
			expect(JSON.parse(JSON.stringify(raw))).not.toHaveProperty("editor");
		});

		it("adopts a nullable source's multiplicity instead of descending into it", () => {
			const raw = reshapeTo(reshapeShape({ sponsor: nameOnly }), makePost());

			expect(raw.sponsor).toBeNull();
		});

		it("nests a target inside a target, all the way down", () => {
			const site = makeSite();
			const raw = reshapeTo(
				reshapeShape({
					post: reshapeShape({
						title: StringVO,
						author: nameOnly,
						tags: slugOnly,
					}),
				}),
				site,
			);

			expect(Object.keys(raw.post).sort()).toEqual([
				"author",
				"createdAt",
				"id",
				"tags",
				"title",
			]);
			expect(raw.post.author.name).toBe("Ada");
			expect(raw.post.tags.map((tag) => tag.slug)).toEqual(["one", "two"]);
			expect(raw.post.id).toBe(site.post.id);
		});

		it("mixes class targets and nested targets in one shape", () => {
			const raw = reshapeTo(
				reshapeShape({ title: StringVO, author: AuthorCard, tags: slugOnly }),
				makePost(),
			);

			expect(raw.title).toBe("A Post");
			expect(raw.author.name).toBe("Ada");
			expect(raw.tags).toHaveLength(2);
		});

		it("rejects a nested target against a value-object source — there is nothing to cut", () => {
			try {
				reshapeTo(reshapeShape({ title: nameOnly }), makePost());
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe("title");
			}
		});

		it("names the dotted path when a nested target diverges", () => {
			try {
				reshapeTo(
					reshapeShape({ author: reshapeShape({ twitter: StringVO }) }),
					makePost(),
				);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"author.twitter",
				);
			}
		});

		/** The `[]` segment is what says the divergence is in an item, not the list. */
		it("marks the path with [] when the divergence is inside an array source", () => {
			try {
				reshapeTo(
					reshapeShape({ tags: reshapeShape({ headline: StringVO }) }),
					makePost(),
				);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"tags[].headline",
				);
			}
		});

		/**
		 * A plain target shape never goes through `modelFor`, so its cycle is
		 * `reshapeTo`'s to catch — the same guard the class form relies on, now
		 * reachable without declaring a cyclic entity at all.
		 */
		it("detects a cycle in a nested target", () => {
			const cyclic: Record<string, unknown> = {};

			cyclic.author = cyclic;

			expect(() => reshapeTo(cyclic as ReshapeShapeBase, makePost())).toThrow(
				CyclicEntityDefinitionException,
			);
		});

		it("produces array items the target entity's fromJSON accepts", () => {
			const post = makePost();
			const [first = expect.unreachable()] = reshapeTo(
				reshapeShape({ tags: slugOnly }),
				post,
			).tags;
			const card = TagCard.fromJSON(first);
			const [source = expect.unreachable()] = post.get("tags");

			expect(card.slug).toBe("one");
			expect(card.id).toBe(source.id);
		});

		/**
		 * The type has to make the same three promises the runtime does:
		 * multiplicity comes from the source, identity comes from the source, and
		 * an optional source key stays optional.
		 */
		it("types multiplicity, identity and optionality off the source", () => {
			type Raw = ReturnType<
				typeof reshapeTo<
					{
						author: typeof nameOnly;
						tags: typeof slugOnly;
						editor: typeof nameOnly;
					},
					Post
				>
			>;

			assertEqual<
				Equal<Raw["tags"], readonly SerializedEntity<{ slug: typeof SlugVO }>[]>
			>();
			assertEqual<
				Equal<Raw["author"], SerializedEntity<{ name: typeof StringVO }>>
			>();
			assertEqual<Equal<"editor" extends keyof Raw ? true : false, true>>();
			assertEqual<
				Equal<undefined extends Raw["editor"] ? true : false, true>
			>();
		});
	});
});
