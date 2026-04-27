import { SlugDTO } from "@/collections/dtos/slug.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link SlugDTO}.
 *
 * Note: this validator does not normalise the input — it only checks shape. To
 * auto-normalise via `slugify()` *and* validate, use {@link SlugVO.make} instead.
 *
 * @example
 * ```ts
 * import { SlugSchema } from "@roastery/beans/collections";
 *
 * SlugSchema.match("my-cool-post"); // true
 * SlugSchema.match("My Cool Post"); // false (uppercase + spaces)
 * ```
 *
 * @see {@link SlugDTO}
 * @see {@link SlugVO}
 */
export const SlugSchema = Schema.make(SlugDTO);
