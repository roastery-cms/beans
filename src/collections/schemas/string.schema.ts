import { StringDTO } from "@/collections/dtos/string.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link StringDTO} (non-empty string).
 *
 * Reused by {@link DefinedStringVO}; there is no dedicated `defined-string` schema.
 *
 * @example
 * ```ts
 * import { StringSchema } from "@roastery/beans/collections";
 *
 * StringSchema.match("hello"); // true
 * StringSchema.match("");      // false (empty)
 * ```
 *
 * @see {@link StringDTO}
 * @see {@link DefinedStringVO}
 */
export const StringSchema = Schema.make(StringDTO);
