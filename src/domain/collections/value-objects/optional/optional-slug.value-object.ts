import slugify from "slugify";
import { optionalVO } from "../custom";
import { SlugSchema } from "../../schemas";

/**
 * {@link SlugVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link SlugSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `SlugVO`'s own `"slug"`.
 *
 * The `transform` hook mirrors `SlugVO`'s own: a real string still gets
 * slugified before validation (`optionalVO` only wraps a *schema*, not a VO's
 * `transform` override, so this has to be declared here explicitly).
 * `undefined` passes through untouched — `slugify` never sees it.
 *
 * @see `SlugVO` in `@roastery/beans/domain/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new OptionalSlugVO(undefined, { name: "slug", source: "post" }).value;      // undefined
 * new OptionalSlugVO("My Cool Post!", { name: "slug", source: "post" }).value; // "my-cool-post"
 * ```
 */
export const OptionalSlugVO = optionalVO(SlugSchema, {
	name: "OptionalSlugVO",
	transform: (value) =>
		value === undefined
			? value
			: slugify(value, { lower: true, strict: true, trim: true }),
});
