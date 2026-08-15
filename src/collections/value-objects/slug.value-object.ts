import slugify from "slugify";
import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import { SlugSchema } from "../schemas";

/**
 * URL-safe slug value-object. Validates against {@link SlugSchema}.
 *
 * Unlike most VOs, it **transforms** the input via {@link slugify} *before*
 * validation: `new SlugVO("My Cool Post", context)` succeeds and the stored
 * `value` is `"my-cool-post"`. If you need to reject (rather than normalise)
 * malformed input, validate the raw string against {@link SlugSchema} directly
 * before constructing.
 *
 * The demo default is already in canonical form — `transform` does not run
 * over defaults.
 *
 * @see {@link SlugSchema}
 * @see {@link slugify}
 *
 * @example
 * ```ts
 * new SlugVO("My Cool Post!", { name: "slug", source: "post" }).value; // "my-cool-post"
 * ```
 */
export class SlugVO extends ValueObject<string, typeof SlugSchema> {
	/** @returns The slug schema and an already-canonical demo default. */
	protected defineMeta(): IValueObjectMetadata<string, typeof SlugSchema> {
		return { default: "slug", schema: SlugSchema };
	}

	/**
	 * Slugifies the raw input before validation.
	 *
	 * @param value - Free-form input.
	 * @returns Its slugified form, which will be validated and stored.
	 */
	protected override transform(value: string): string {
		return slugify(value, {
			lower: true,
			strict: true,
			trim: true,
		});
	}
}
