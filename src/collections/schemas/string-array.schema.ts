import { StringArrayDTO } from "@/collections/dtos/string-array.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link StringArrayDTO}.
 *
 * @example
 * ```ts
 * import { StringArraySchema } from "@roastery/beans/collections";
 *
 * StringArraySchema.match(["a", "b"]); // true
 * StringArraySchema.match([]);          // true (empty array allowed)
 * StringArraySchema.match(["a", 1]);    // false (mixed types)
 * ```
 *
 * @see {@link StringArrayDTO}
 * @see {@link StringArrayVO}
 */
export const StringArraySchema = Schema.make(StringArrayDTO);
