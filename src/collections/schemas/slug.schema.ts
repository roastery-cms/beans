import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for URL-safe slug strings.
 *
 * Validation is delegated to the `"slug"` format registered in
 * `@roastery/terroir/schema/formats`. Plus a hard `minLength: 1` so the empty
 * string is always rejected.
 *
 * The slug **format** does not normalise the input; for the auto-slugified VO
 * pipeline (`slugify(value)` → validate), use {@link SlugVO}.
 *
 * @see {@link SlugVO} — value-object that runs `slugify()` before validation.
 */
export const SlugSchema = t.String({
	description: "The unique slug identifier of the resource to query.",
	examples: ["my-cool-post"],
	format: "slug",
	minLength: 1,
});

/** Static type of {@link SlugSchema} — equivalent to `string`. */
export type SlugSchema = ToDTO<typeof SlugSchema>;
