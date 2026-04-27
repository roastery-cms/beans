import { UrlDTO } from "@/collections/dtos/url.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link UrlDTO} (HTTP/HTTPS only).
 *
 * @example
 * ```ts
 * import { UrlSchema } from "@roastery/beans/collections";
 *
 * UrlSchema.match("https://example.com/path"); // true
 * UrlSchema.match("redis://localhost");        // false (use SimpleUrlSchema)
 * ```
 *
 * @see {@link UrlDTO}
 * @see {@link UrlVO}
 * @see {@link SimpleUrlSchema} — any-protocol counterpart.
 */
export const UrlSchema = Schema.make(UrlDTO);
