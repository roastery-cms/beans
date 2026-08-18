import { SlugVO, StringVO, UuidVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type {
	AccessorsOf,
	EntityDefinition,
	EntityHas,
} from "@/domain/entity/types";
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
