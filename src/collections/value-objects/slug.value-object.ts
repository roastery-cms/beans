import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import { slugify } from "@/entity/helpers";
import type { SlugDTO } from "../dtos";
import { SlugSchema } from "../schemas";

/**
 * Value-object wrapper around a URL-safe slug. Validates against {@link SlugSchema}.
 *
 * Unlike most VOs, `make` **transforms** the input via {@link slugify} *before*
 * validation. That means `SlugVO.make("My Cool Post", info)` succeeds and the
 * stored `value` is `"my-cool-post"`. If you need to reject (rather than
 * normalise) malformed input, validate the raw string against {@link SlugSchema}
 * directly before invoking the factory.
 *
 * @see {@link SlugDTO}
 * @see {@link SlugSchema}
 * @see {@link slugify}
 *
 * @example
 * ```ts
 * import { SlugVO } from "@roastery/beans/collections";
 *
 * const info = { name: "slug", source: "Post" };
 * SlugVO.make("My Cool Post!", info); // stored value: "my-cool-post"
 * ```
 */
export class SlugVO extends ValueObject<string, typeof SlugDTO> {
	protected override readonly schema: Schema<typeof SlugDTO> = SlugSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Slugifies `value` and wraps the result, validating before returning.
	 *
	 * @param value - Free-form input. Passed through {@link slugify} before
	 *   being stored — the `value` exposed by the resulting VO is the
	 *   normalised slug, not the original input.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when the slugified output fails
	 *   {@link SlugSchema} validation (e.g. an input that slugifies to the empty string).
	 */
	public static make(value: string, info: IValueObjectMetadata): SlugVO {
		const newVO = new SlugVO(slugify(value), info);

		newVO.validate();

		return newVO;
	}
}
