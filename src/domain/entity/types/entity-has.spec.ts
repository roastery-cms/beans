import {
	BooleanVO,
	IntegerVO,
	SlugVO,
	StringVO,
	UuidVO,
} from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type {
	AccessorsOf,
	EntityDefinition,
	EntityHas,
} from "@/domain/entity/types";
import { recordOf } from "@/domain/record";
import { arrayOf, nullableOf, optionalOf } from "@/domain/wrapper/helpers";
import { describe, expect, it } from "bun:test";

/** Domain vocabulary: adds nothing of its own — the exact aliasing pattern `EntityHas` must accept as a match for `UuidVO`. */
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

describe("EntityHas", () => {
	it("resolves true for a key backed by the exact expected VO class", () => {
		const result: EntityHas<typeof Post, { slug: typeof SlugVO }> = true;
		expect(result).toBe(true);
	});

	it("resolves true for a key backed by a subclass of the expected VO class", () => {
		const result: EntityHas<typeof Post, { authorId: typeof UuidVO }> = true;
		expect(result).toBe(true);
	});

	it("resolves true when every key of ExpectedShape is satisfied", () => {
		const result: EntityHas<
			typeof Post,
			{ slug: typeof SlugVO; authorId: typeof UuidVO }
		> = true;
		expect(result).toBe(true);
	});

	it("resolves true for an empty ExpectedShape — vacuously, there is nothing to fail", () => {
		// biome-ignore lint/complexity/noBannedTypes: {} is the deliberate empty-shape case under test.
		const result: EntityHas<typeof Post, {}> = true;
		expect(result).toBe(true);
	});

	it("resolves false for a key the blueprint does not declare", () => {
		const result: EntityHas<typeof Post, { publishedAt: typeof UuidVO }> =
			false;
		expect(result).toBe(false);
	});

	it("resolves false for a key backed by an unrelated VO class", () => {
		const result: EntityHas<typeof Post, { title: typeof SlugVO }> = false;
		expect(result).toBe(false);
	});

	it("resolves false when only part of ExpectedShape is satisfied", () => {
		const result: EntityHas<
			typeof Post,
			{ slug: typeof SlugVO; publishedAt: typeof UuidVO }
		> = false;
		expect(result).toBe(false);
	});
});

const tagProperties = blueprint({
	name: StringVO,
	hidden: BooleanVO,
}).with({ hidden: { default: false } });

class Tag extends entityOf(tagProperties, "has-type-tag") {}

/** Structurally distinct from its parent, so the type level answers both directions. */
class VipTag extends Tag {
	public promote(): void {}
}

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"has-type-money",
) {
	public isFree(): boolean {
		return this.amount === 0;
	}
}

class Weight extends recordOf(
	{ amount: IntegerVO, unit: StringVO },
	"has-type-weight",
) {}

const TagList = arrayOf(Tag);
const MaybeTag = optionalOf(Tag);
const NullableTag = nullableOf(Tag);
const VipTagList = arrayOf(VipTag);

const articleProperties = blueprint({
	title: StringVO,
	tags: TagList,
	editor: MaybeTag,
	price: Money,
}).done();

class Article extends entityOf(articleProperties, "has-type-article") {}

describe("EntityHas — the four blueprint kinds", () => {
	it("resolves true for a nested record key", () => {
		const result: EntityHas<typeof Article, { price: typeof Money }> = true;
		expect(result).toBe(true);
	});

	it("resolves false for a different record class", () => {
		const result: EntityHas<typeof Article, { price: typeof Weight }> = false;
		expect(result).toBe(false);
	});

	it("resolves true for a wrapped key of the same kind and inner class", () => {
		const result: EntityHas<typeof Article, { tags: typeof TagList }> = true;
		expect(result).toBe(true);
	});

	it("resolves true for a single-valued wrapper of the same kind", () => {
		const result: EntityHas<typeof Article, { editor: typeof MaybeTag }> = true;
		expect(result).toBe(true);
	});

	it("resolves false for the unwrapped class of a wrapped key", () => {
		const list: EntityHas<typeof Article, { tags: typeof Tag }> = false;
		const single: EntityHas<typeof Article, { editor: typeof Tag }> = false;

		expect(list).toBe(false);
		expect(single).toBe(false);
	});

	it("resolves false for a wrapper of the wrong kind", () => {
		const nullable: EntityHas<typeof Article, { editor: typeof NullableTag }> =
			false;
		const list: EntityHas<typeof Article, { editor: typeof TagList }> = false;

		expect(nullable).toBe(false);
		expect(list).toBe(false);
	});

	it("resolves false for a wrapper expected on an unwrapped key", () => {
		const result: EntityHas<typeof Article, { title: typeof TagList }> = false;
		expect(result).toBe(false);
	});

	it("accepts a subclass inside a wrapper, and refuses the parent for a subclass key", () => {
		const vipProperties = { tags: VipTagList };

		class VipArticle extends entityOf(vipProperties, "has-type-vip-article") {}

		const accepted: EntityHas<typeof VipArticle, { tags: typeof TagList }> =
			true;
		const refused: EntityHas<typeof Article, { tags: typeof VipTagList }> =
			false;

		expect(accepted).toBe(true);
		expect(refused).toBe(false);
	});
});
