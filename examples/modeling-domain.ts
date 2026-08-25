/**
 * Modelling one aggregate tree: `User` owns `Post`, `Post` owns `Comment`,
 * and each child carries a back-reference the parent fills in itself.
 *
 * Run it with:
 *
 *     mise exec -- bun examples/modeling-domain.ts
 *
 * Three things worth watching: `RawContextExcept`, which is the child's
 * payload minus the key the parent supplies; adoption, which is why the
 * instance a method builds is the same object the parent then holds; and the
 * deep drain, which reaches a nested aggregate's buffer without being asked.
 *
 * The three payload forms have their own walk-through in
 * `examples/testing-event-payload.ts`.
 */

import {
	EmailVO,
	PasswordVO,
	StringVO,
	UuidVO,
} from "@/domain/collections/value-objects";
import { onCreate } from "@/domain/entity/decorators";
import type { RawContextExcept } from "@/domain/entity/types";
import {
	arrayOf,
	blueprint,
	defineDomainEvent,
	entityOf,
	reshapeShape,
} from "@/way";
import { Json } from "@roastery/terroir/symbols";

// ---------------------------------------------------------------------------
// The leaf. `postId` is the back-reference: a comment always belongs to a post,
// so the post is what supplies it — never the caller.
// ---------------------------------------------------------------------------

const commentProperties = blueprint({
	postId: UuidVO,
	authorId: UuidVO,
	content: StringVO,
}).done();

class Comment extends entityOf(commentProperties, "comment") {}

// ---------------------------------------------------------------------------
// The middle. Its create event carries `Json`, so a subscriber receives the
// post's whole serialization, identity included.
// ---------------------------------------------------------------------------

const PostCreated = defineDomainEvent("post.created", Json);

const postProperties = blueprint({
	authorId: UuidVO,
	title: StringVO,
	content: StringVO,
	comments: arrayOf(Comment),
}).with({ comments: { default: [] } });

@onCreate(PostCreated)
class Post extends entityOf(postProperties, "post") {
	public addComment(
		comment: RawContextExcept<typeof commentProperties, "postId">,
	): Comment {
		const created = new Comment({ ...comment, postId: this.id });

		// The built instance goes in as it is and is *adopted*, not rebuilt —
		// which is what makes returning it honest: the caller and the post end
		// up holding the same object.
		this.set("comments", [...this.comments, created]);

		return created;
	}
}

// ---------------------------------------------------------------------------
// The root. Its create event declares a shape, so `password` — which is never
// named in it — cannot reach a subscriber at all.
// ---------------------------------------------------------------------------

const userCard = reshapeShape({
	name: StringVO,
	email: EmailVO,
});

const UserCreated = defineDomainEvent("user.created", userCard);

const userProperties = blueprint({
	name: StringVO,
	email: EmailVO,
	password: PasswordVO,
	posts: arrayOf(Post),
	comments: arrayOf(Comment),
}).with({ posts: { default: [] }, comments: { default: [] } });

@onCreate(UserCreated)
class User extends entityOf(userProperties, "user") {
	public addPost(
		post: RawContextExcept<typeof postProperties, "authorId">,
	): Post {
		const created = new Post({ ...post, authorId: this.id });

		this.set("posts", [...this.posts, created]);

		return created;
	}
}

// ---------------------------------------------------------------------------

const author = new User({
	name: "Alan",
	email: "alan@roastery.dev",
	password: "Password-123",
});

const reader = new User({
	name: "Ada",
	email: "ada@roastery.dev",
	password: "Password-456",
});

const post = author.addPost({
	title: "Blueprint-driven aggregates",
	content: "…the whole body…",
});

const comment = post.addComment({
	authorId: reader.id,
	content: "This is the part I always get wrong.",
});

console.log(`
A child is built by the parent, and the parent keeps that very instance —
so what the method returns and what the aggregate holds are one object.

  post === author.posts[0]      ${post === author.posts[0]}
  comment === post.comments[0]  ${comment === post.comments[0]}
  the parent filled the link    ${comment.postId === post.id}
  and the caller never saw it   ${post.authorId === author.id}`);

// ---------------------------------------------------------------------------
// One drain from the root reaches the nested post's buffer too — deep is the
// default. The two payloads show the two declarations side by side.
// ---------------------------------------------------------------------------

const events = author.pullDomainEvents();

console.log(`\nOne pull from the root drained ${events.length} events:\n`);
console.dir(events, { depth: null });

console.log(`
\`user.created\` declared a shape, and \`password\` is not in it, so it never
left. \`post.created\` declared \`Json\`, so it carries the post's whole
serialization — root identity included.

  password in the user payload?  ${"password" in (events[0]?.payload as object)}
  post id in the post payload?   ${"id" in (events[1]?.payload as object)}

A payload is a snapshot taken at the raise, not at the drain — which is why
the post's \`comments\` is empty above. \`@onCreate\` fires inside the
constructor, and the comment was added after it returned.`);
