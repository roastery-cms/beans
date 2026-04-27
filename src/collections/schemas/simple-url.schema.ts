import { SimpleUrlDTO } from "@/collections/dtos/simple-url.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link SimpleUrlDTO} (any-protocol URI).
 *
 * @example
 * ```ts
 * import { SimpleUrlSchema } from "@roastery/beans/collections";
 *
 * SimpleUrlSchema.match("redis://localhost:6379"); // true
 * SimpleUrlSchema.match("not a url");              // false
 * ```
 *
 * @see {@link SimpleUrlDTO}
 * @see {@link UrlSchema} — HTTP/HTTPS-only counterpart.
 */
export const SimpleUrlSchema = Schema.make(SimpleUrlDTO);
