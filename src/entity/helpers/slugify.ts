import slug from "slugify";

/**
 * Normalises a free-form string into a URL-safe slug.
 *
 * Hard-codes three options on the underlying `slugify` package, in this order:
 * - `lower: true` — output is always lower-case so slugs match across the API
 *   regardless of how the source was capitalised.
 * - `strict: true` — strips every character outside `[a-z0-9-]` (no underscores,
 *   no Unicode letters), so the result is safe in URL paths without further encoding.
 * - `trim: true` — drops leading/trailing whitespace before transforming.
 *
 * The hard-coded options are intentional: every {@link SlugVO} round-trips its
 * value through this function before validation, and a moving target would
 * change validation outcomes between releases.
 *
 * @param target - Free-form input string.
 * @returns A URL-safe slug (lower-case, only `[a-z0-9-]`).
 *
 * @example
 * ```ts
 * import { slugify } from "@roastery/beans/entity";
 *
 * slugify("My Cool Post!"); // "my-cool-post"
 * ```
 */
export function slugify(target: string): string {
	return slug(target, {
		lower: true,
		strict: true,
		trim: true,
	});
}
