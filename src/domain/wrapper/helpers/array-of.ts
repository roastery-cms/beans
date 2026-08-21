import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrapperClassOf } from "../types/wrapper-class-of.type";
import { defineWrapper } from "./define-wrapper";

/** The `source` every `arrayOf` class reports in an item's error context. */
const ARRAY_SOURCE = "array-of";

/**
 * Declares a blueprint key as a **list** of another blueprint class: a
 * value-object, an entity or a record.
 *
 * It exists so multiplicity stops polluting the ubiquitous language. Without
 * it, "a post has many tags" has to be spelled as a `TagListVO` or a
 * `PostTags` record — names that are not domain concepts, only variations on
 * one. `tags: arrayOf(PostTag)` says the same thing without inventing a type.
 *
 * Construction relaxes item by item exactly as the unwrapped key would: a
 * wrapped entity's identity stays optional-all-or-nothing per item, and its
 * ruled and `optionalVO`-backed keys stay omittable per item.
 *
 * **Reads are unwrapped, and there is no `.add()`.** `post.tags` is the
 * `readonly PostTag[]` itself — the wrapper is a multiplicity, not a
 * collection object with verbs of its own. Appending therefore replaces the
 * whole list through `set`, and the existing items must go back **through
 * `toJSON()`**, which is what preserves their `id`s; omitting an item's
 * identity mints a new one. That is the same contract `set` already has on a
 * nested entity key, only more visible in a list.
 *
 * **Uniqueness inside the list is not checked, and is not this key's
 * business.** `unique` is an invariant of a *set of rows*, declared on the
 * inner class and enforced by whoever implements that class's repository port.
 * `arrayOf(PostTag)` where `PostTag` declares `unique: ["slug"]` will happily
 * hold two tags with the same slug.
 *
 * **Call it at module scope, once** — each call mints a fresh class and a
 * fresh schema, like every other class factory in the package.
 *
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @param inner - The class each item is built from.
 * @returns A wrapper class usable as a blueprint value.
 *
 * @example
 * ```ts
 * const postProperties = blueprint({ title: StringVO, tags: arrayOf(PostTag) }).done();
 *
 * class Post extends entityOf(postProperties, "post") {}
 *
 * const post = new Post({ title: "x", tags: [{ name: "Alan Reis" }] });
 *
 * post.tags[0].slug;          // "alan-reis" — the inner blueprint's own rules ran
 * post.tags[0].rename("Bob"); // the inner entity's verbs stay reachable
 *
 * post.set("tags", [...post.tags.map((tag) => tag.toJSON()), { name: "new" }]);
 * ```
 *
 * @see `optionalOf`, `nullableOf` in `.` — the single-valued multiplicities.
 * @see `customArrayVO` in `@/domain/collections/value-objects/custom` — the
 *   schema-level sibling. Neither deprecates the other: that one wraps a
 *   *schema*, this one wraps a *class*, inheriting its `transform`, `validate`
 *   and `sensitive` along with it.
 */
export function arrayOf<const Inner extends WrappableClass>(
	inner: Inner,
): WrapperClassOf<"array", Inner> {
	return defineWrapper("array", inner, ARRAY_SOURCE);
}
