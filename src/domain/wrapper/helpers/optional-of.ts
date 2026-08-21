import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrapperClassOf } from "../types/wrapper-class-of.type";
import { defineWrapper } from "./define-wrapper";

/** The `source` every `optionalOf` class reports in its item's error context. */
const OPTIONAL_SOURCE = "optional-of";

/**
 * Declares a blueprint key as an **optional** instance of another blueprint
 * class: a value-object, an entity or a record.
 *
 * `optionalVO`'s counterpart one level up. That one wraps a *schema* and
 * therefore only ever reaches a value-object; this wraps a *class*, so an
 * entity or a record can be optional too — `author: optionalOf(Author)` — with
 * no `MaybeAuthor` invented to say it.
 *
 * The key becomes **omittable** in the construction payload, through the same
 * `UndefinedableKeys` machinery an `optionalVO`-backed key already goes
 * through, and the derived schema is emitted under `t.Optional`, so a
 * `JSON.stringify` round-trip that drops the key still hydrates.
 *
 * Reach for this when the value **may not have been provided**, and for
 * `nullableOf` when it was provided and is explicitly empty — the usual
 * `undefined` (request body) versus `null` (database column) split.
 *
 * **Call it at module scope, once** — each call mints a fresh class and a
 * fresh schema.
 *
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @param inner - The class the value is built from, when present.
 * @returns A wrapper class usable as a blueprint value.
 *
 * @example
 * ```ts
 * const postProperties = blueprint({ title: StringVO, author: optionalOf(Author) }).done();
 *
 * class Post extends entityOf(postProperties, "post") {}
 *
 * new Post({ title: "x" }).author;                       // undefined — the key is omittable
 * new Post({ title: "x", author: { name: "Alan" } }).author?.name; // "Alan"
 * ```
 *
 * @see `nullableOf` in `./nullable-of` — the mirror image, and why the two are
 *   not interchangeable.
 * @see `optionalVO` in `@/domain/collections/value-objects/custom` — the
 *   schema-level sibling.
 */
export function optionalOf<const Inner extends WrappableClass>(
	inner: Inner,
): WrapperClassOf<"optional", Inner> {
	return defineWrapper("optional", inner, OPTIONAL_SOURCE);
}
