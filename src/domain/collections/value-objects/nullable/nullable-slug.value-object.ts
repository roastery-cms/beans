import slugify from "slugify";
import { nullableVO } from "../custom";
import { SlugSchema } from "../../schemas";

/**
 * {@link SlugVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link SlugSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `SlugVO`'s own `"slug"`. Unlike an `Optional*VO`, the blueprint key
 * stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `SlugVO`'s own: a real string still gets
 * slugified before validation (`nullableVO` only wraps a *schema*, not a VO's
 * `transform` override, so this has to be declared here explicitly). `null`
 * passes through untouched — `slugify` never sees it.
 *
 * @see `SlugVO` in `@roastery/beans/domain/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new NullableSlugVO(null, { name: "slug", source: "post" }).value;           // null
 * new NullableSlugVO("My Cool Post!", { name: "slug", source: "post" }).value; // "my-cool-post"
 * ```
 */
export const NullableSlugVO = nullableVO(SlugSchema, {
	name: "NullableSlugVO",
	transform: (value) =>
		value === null
			? value
			: slugify(value, { lower: true, strict: true, trim: true }),
});
