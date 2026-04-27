import { IdObjectDTO } from "@/collections/dtos/id-object.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link IdObjectDTO}.
 *
 * @example
 * ```ts
 * import { IdObjectSchema } from "@roastery/beans/collections";
 *
 * IdObjectSchema.match({ id: "550e8400-e29b-41d4-a716-446655440000" }); // true
 * IdObjectSchema.match({ id: "not-a-uuid" });                            // false
 * ```
 *
 * @see {@link IdObjectDTO}
 */
export const IdObjectSchema = Schema.make(IdObjectDTO);
