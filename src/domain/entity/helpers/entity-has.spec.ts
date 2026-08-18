import { SlugVO, StringVO, UuidVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import { entityHas } from "@/domain/entity/helpers";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
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
