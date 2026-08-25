import { StringVO, UuidVO } from "@/domain/collections/value-objects";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type { RawContextExcept } from "@/domain/entity/types";
import { arrayOf } from "@/domain/wrapper/helpers";
import { IncompleteIdentityException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";

const commentProperties = blueprint({
	postId: UuidVO,
	content: StringVO,
}).done();

class Comment extends entityOf(commentProperties, "comment") {}

const postProperties = blueprint({
	authorId: UuidVO,
	title: StringVO,
	comments: arrayOf(Comment),
}).with({ comments: { default: [] } });

class Post extends entityOf(postProperties, "post") {}

const userProperties = blueprint({ posts: arrayOf(Post) }).with({
	posts: { default: [] },
});

/** The payload an owning aggregate takes for a child whose back-reference it supplies itself. */
type NewPost = RawContextExcept<typeof postProperties, "authorId">;

class User extends entityOf(userProperties, "user") {
	public addPost(post: NewPost): Post {
		this.set("posts", [
			...this.posts.map((it) => it.toJSON()),
			new Post({ ...post, authorId: this.id }).toJSON(),
		]);

		return this.posts[this.posts.length - 1] as Post;
	}
}

const identity = {
	id: "0198f0e0-0000-7000-8000-000000000000",
	createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

describe("RawContextExcept", () => {
	it("drops the excluded key from the payload", () => {
		const user = new User({});
		// @ts-expect-error - `authorId` is the key the aggregate supplies.
		const post: NewPost = { title: "t", authorId: user.id };

		expect(user.addPost(post).authorId).toBe(user.id);
	});

	it("keeps a ruled key optional", () => {
		const user = new User({});
		const post: NewPost = { title: "t" };

		expect(user.addPost(post).comments).toEqual([]);
	});

	it("still accepts a full identity, so the payload stays hydratable", () => {
		const user = new User({});
		const added = user.addPost({ title: "t", ...identity });

		expect(added.id).toBe(identity.id);
		expect(added.createdAt).toBe(identity.createdAt);
	});

	it("still mints a fresh identity when none is passed", () => {
		const user = new User({});
		const added = user.addPost({ title: "t" });

		expect(added.id).not.toBe(identity.id);
	});

	it("rejects a key the blueprint does not declare", () => {
		// @ts-expect-error - "titel" is not a domain key of the blueprint.
		const misspelled: RawContextExcept<typeof postProperties, "titel"> = {
			title: "t",
			authorId: identity.id,
		};

		expect(misspelled.title).toBe("t");
	});

	it("rejects an identity key, which the payload must keep to stay hydratable", () => {
		// @ts-expect-error - identity is never the aggregate's to supply.
		const cut: RawContextExcept<typeof postProperties, "id"> = {
			title: "t",
			authorId: identity.id,
		};

		expect(cut.title).toBe("t");
	});

	it("rejects half an identity, the rule a plain `Omit` would have collapsed", () => {
		const user = new User({});

		expect(() =>
			// @ts-expect-error - `createdAt` may not be left out once `id` is given.
			user.addPost({ title: "t", id: identity.id }),
		).toThrow(IncompleteIdentityException);
	});
});
