import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RawContextOf } from "./raw-context-of.type";

/**
 * A subclass's construction payload with a chosen set of keys removed, and the
 * all-or-nothing identity rule left intact — the payload an **owning
 * aggregate** takes for a child it is about to build, minus the keys it
 * supplies itself (a back-reference such as `authorId`, most often).
 *
 * ```ts
 * class User extends entityOf(userProperties, "user") {
 * 	public addPost(post: RawContextExcept<typeof postProperties, "authorId">): void {
 * 		this.set("posts", [
 * 			...this.posts.map((it) => it.toJSON()),
 * 			new Post({ ...post, authorId: this.id }).toJSON(),
 * 		]);
 * 	}
 * }
 * ```
 *
 * **This exists because a plain `Omit` over `RawContextOf` is a trap.** That
 * type is an intersection with the *union* `IdentityInput`, and `Omit` is a
 * mapped type over `keyof`, which collapses a union into a single object type:
 * the two branches merge, the rule degrades into
 * `id?: string | undefined; createdAt?: string | undefined`, and the result is
 * then assignable back to *neither* — not to `{ id?: never }`, because `string`
 * is not `undefined`, and not to `IRawEntity`, because `id` is now optional.
 * The failure surfaces far from its cause, as `Type 'string' is not assignable
 * to type 'undefined'` on whatever consumes the payload afterwards.
 *
 * Distributing the `Omit` over each branch keeps both alive, so a caller may
 * still pass `id` and `createdAt` together to preserve an identity, omit them
 * both for a fresh one, and is still rejected for passing half of one — at
 * compile time here, and by `IncompleteIdentityException` at runtime.
 *
 * The `infer` step is what makes that distribution happen at all: a conditional
 * type distributes only over a *naked type parameter*, and `RawContextOf<…>` is
 * an alias application, not one. Binding it to `Context` first supplies the
 * naked parameter the distribution needs.
 *
 * The sibling pillars need no counterpart: a record's and a command's payloads
 * carry no identity, so `RawRecordContextOf` and `RawCommandContextOf` are
 * plain object types that `Omit` handles correctly on its own.
 *
 * **`ExcludedKeys` is constrained to the blueprint's own domain keys**, read
 * through `DomainKeys` so the `Rules` symbol slot never surfaces as one. A key
 * the blueprint does not declare is a compile error rather than a silent no-op,
 * and an editor completes the real keys at the call site — which matters most
 * exactly where this type is used, since a misspelled key would otherwise leave
 * the payload demanding the very property the aggregate meant to supply.
 *
 * The identity keys are deliberately *not* in that constraint. Removing them is
 * the one narrowing this type exists to prevent: `RawContextOf` is hydratable
 * because a caller may pass `id` and `createdAt`, and a payload that has had
 * them cut can only ever build a fresh entity. Use `Omit` directly, on purpose,
 * when that is genuinely what a method wants.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam ExcludedKeys - The domain keys to remove from the payload.
 *
 * @see {@link RawContextOf} — the full payload this narrows.
 * @see `DomainKeys` in `./domain-keys.type` — the constraint's source.
 * @see `IdentityInput` in `./identity-input.type` — the union that makes the
 *   distribution necessary.
 *
 * @example
 * ```ts
 * // Identity survives, all-or-nothing:
 * type Input = RawContextExcept<typeof postProperties, "authorId">;
 *
 * const fresh: Input = { title: "t", content: "c" };
 * const kept: Input = { title: "t", content: "c", id, createdAt };
 * // @ts-expect-error - half an identity
 * const half: Input = { title: "t", content: "c", id };
 * ```
 */
export type RawContextExcept<
	PropertiesShape extends PropertiesShapeBase,
	ExcludedKeys extends DomainKeys<PropertiesShape>,
> =
	RawContextOf<PropertiesShape> extends infer Context
		? Context extends unknown
			? Omit<Context, ExcludedKeys>
			: never
		: never;
