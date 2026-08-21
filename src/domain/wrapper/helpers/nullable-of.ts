import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrapperClassOf } from "../types/wrapper-class-of.type";
import { defineWrapper } from "./define-wrapper";

/** The `source` every `nullableOf` class reports in its item's error context. */
const NULLABLE_SOURCE = "nullable-of";

/**
 * Declares a blueprint key as a **nullable** instance of another blueprint
 * class: a value-object, an entity or a record.
 *
 * `nullableVO`'s counterpart one level up, and `optionalOf`'s mirror image.
 * **The two are not interchangeable**: `null` never extends `undefined`, so a
 * `nullableOf` key is **never** omittable — the caller states `null`
 * explicitly (`new Post({ author: null })`, never `new Post({})`) and the
 * derived schema keeps the key required.
 *
 * Reach for this when the value was provided and is explicitly empty — the
 * usual shape of a `NULL` database column — and for `optionalOf` when it may
 * not have been provided at all.
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
 * const postProperties = blueprint({ title: StringVO, author: nullableOf(Author) }).done();
 *
 * class Post extends entityOf(postProperties, "post") {}
 *
 * new Post({ title: "x", author: null }).author; // null — the key stays required
 * ```
 *
 * @see `optionalOf` in `./optional-of` — the mirror image.
 * @see `nullableVO` in `@/domain/collections/value-objects/custom` — the
 *   schema-level sibling.
 */
export function nullableOf<const Inner extends WrappableClass>(
	inner: Inner,
): WrapperClassOf<"nullable", Inner> {
	return defineWrapper("nullable", inner, NULLABLE_SOURCE);
}
