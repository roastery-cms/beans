import { SlugObjectDTO } from "@/collections/dtos/slug-object.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link SlugObjectDTO}.
 *
 * @example
 * ```ts
 * import { SlugObjectSchema } from "@roastery/beans/collections";
 *
 * SlugObjectSchema.match({ slug: "my-cool-post" }); // true
 * SlugObjectSchema.match({ slug: "Bad Slug" });     // false
 * ```
 *
 * @see {@link SlugObjectDTO}
 */
export const SlugObjectSchema = Schema.make(SlugObjectDTO);
