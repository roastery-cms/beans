import {
	BooleanVO,
	IntegerVO,
	SchemaVO,
	UrlVO,
	SlugVO,
	StringVO,
	UuidVO,
} from "@/domain/collections/value-objects";
import { customRecordVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import { blueprint, entityHas, entityOf } from "@/domain/entity/helpers";
import type {
	AccessorsOf,
	EntityDefinition,
	SetHandlersOf,
} from "@/domain/entity/types";
import { recordOf } from "@/domain/record";
import { arrayOf, nullableOf, optionalOf } from "@/domain/wrapper/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { Source } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";

/** Domain vocabulary: adds nothing of its own — the exact aliasing pattern `entityHas` must accept as a match for `UuidVO`. */
class PostAuthorId extends UuidVO {}

const postProperties = {
	title: StringVO,
	slug: SlugVO,
	authorId: PostAuthorId,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

describe("entityHas", () => {
	it("returns true for a key backed by the exact expected VO class", () => {
		expect(entityHas(Post, { slug: SlugVO })).toBe(true);
	});

	it("returns true for a key backed by a subclass of the expected VO class", () => {
		expect(entityHas(Post, { authorId: UuidVO })).toBe(true);
	});

	it("returns true when every key of the expected shape is satisfied", () => {
		expect(entityHas(Post, { slug: SlugVO, authorId: UuidVO })).toBe(true);
	});

	it("returns true for an empty expected shape — vacuously, there is nothing to fail", () => {
		expect(entityHas(Post, {})).toBe(true);
	});

	it("returns false for a key the blueprint does not declare", () => {
		expect(entityHas(Post, { publishedAt: UuidVO })).toBe(false);
	});

	it("returns false for a key backed by an unrelated VO class", () => {
		expect(entityHas(Post, { title: SlugVO })).toBe(false);
	});

	it("returns false when only part of the expected shape is satisfied", () => {
		expect(entityHas(Post, { slug: SlugVO, publishedAt: UuidVO })).toBe(false);
	});
});

const postTagProperties = blueprint({
	name: StringVO,
	slug: SlugVO,
	hidden: BooleanVO,
}).with({ hidden: { default: false }, slug: { derive: (ctx) => ctx.name } });

class PostTag extends entityOf(postTagProperties, "has-post-tag", {
	unique: ["slug"],
}) {
	public rename(value: string): void {
		this.set("name", value);
	}
}

/** Structurally distinct from its parent, so the type level and the runtime agree on both directions. */
class VipPostTag extends PostTag {
	public promote(): void {
		this.rename(`${this.name} (vip)`);
	}
}

const postTypeProperties = blueprint({
	name: StringVO,
	slug: SlugVO,
	shape: SchemaVO,
	isHighlighted: BooleanVO,
}).with({
	slug: { derive: (ctx) => ctx.name },
	isHighlighted: { default: false },
});

class PostType extends entityOf(postTypeProperties, "has-post-type") {
	public reslug(value: string): void {
		this.set("slug", value);
	}
}

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"has-money",
) {
	public isFree(): boolean {
		return this.amount === 0;
	}
}

class Weight extends recordOf(
	{ amount: IntegerVO, unit: StringVO },
	"has-weight",
) {}

const InfoVO = customRecordVO();

const richPostProperties = blueprint({
	name: StringVO,
	slug: SlugVO,
	description: StringVO,
	cover: UrlVO,
	type: optionalOf(PostType),
	tag: arrayOf(PostTag),
	price: Money,
	content: StringVO,
	info: InfoVO,
}).with({ slug: { derive: (ctx) => ctx.name } });

class RichPost extends entityOf(richPostProperties, "has-rich-post") {
	protected override onSet(): SetHandlersOf<typeof richPostProperties> {
		return {
			info: (value, raw) => {
				if (raw.type && !SchemaVO.match(raw.type.shape, value))
					throw new InvalidPropertyException("info", this[Source]);
			},
		};
	}
}

describe("entityHas — the four blueprint kinds", () => {
	it("returns true for a key backed by a nested entity class", () => {
		expect(entityHas(PostTag, { name: StringVO })).toBe(true);
	});

	it("returns true for a key backed by a nested record class", () => {
		expect(entityHas(RichPost, { price: Money })).toBe(true);
	});

	it("returns false for a key backed by a different record class", () => {
		expect(entityHas(RichPost, { price: Weight })).toBe(false);
	});

	it("returns true for a wrapped key, from a wrapper class minted at the call site", () => {
		// The whole point: `arrayOf(PostTag)` here is a *different* class object
		// from the one in the blueprint, so identity and the prototype chain
		// both say no. The two statics are what agree.
		expect(entityHas(RichPost, { tag: arrayOf(PostTag) })).toBe(true);
	});

	it("returns true for a single-valued wrapper of the same kind", () => {
		expect(entityHas(RichPost, { type: optionalOf(PostType) })).toBe(true);
	});

	it("returns true for the whole expected shape at once", () => {
		expect(
			entityHas(RichPost, {
				tag: arrayOf(PostTag),
				type: optionalOf(PostType),
				price: Money,
				info: InfoVO,
			}),
		).toBe(true);
	});

	it("returns false for the unwrapped class of a wrapped key — multiplicity is part of the shape", () => {
		expect(entityHas(RichPost, { type: PostType })).toBe(false);
		expect(entityHas(RichPost, { tag: PostTag })).toBe(false);
	});

	it("returns false for a wrapper of the wrong kind", () => {
		expect(entityHas(RichPost, { type: nullableOf(PostType) })).toBe(false);
		expect(entityHas(RichPost, { type: arrayOf(PostType) })).toBe(false);
	});

	it("returns false for a wrapper around an unrelated class", () => {
		expect(entityHas(RichPost, { tag: arrayOf(PostType) })).toBe(false);
	});

	it("returns false for a wrapper expected on an unwrapped key", () => {
		expect(entityHas(RichPost, { name: arrayOf(StringVO) })).toBe(false);
	});

	it("accepts a subclass inside a wrapper, and refuses the parent for a subclass key", () => {
		const vipProperties = { tags: arrayOf(VipPostTag) };

		class VipPost extends entityOf(vipProperties, "has-vip-post") {}

		expect(entityHas(VipPost, { tags: arrayOf(PostTag) })).toBe(true);
		expect(entityHas(RichPost, { tag: arrayOf(VipPostTag) })).toBe(false);
	});

	it("still answers for a generated value-object class", () => {
		expect(entityHas(RichPost, { info: InfoVO })).toBe(true);
	});
});
