import { UuidArrayDTO } from "@/collections/dtos/uuid-array.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link UuidArrayDTO}.
 *
 * @example
 * ```ts
 * import { UuidArraySchema } from "@roastery/beans/collections";
 *
 * UuidArraySchema.match(["550e8400-e29b-41d4-a716-446655440000"]); // true
 * UuidArraySchema.match([]);                                        // true (empty array allowed)
 * UuidArraySchema.match(["not-a-uuid"]);                            // false
 * ```
 *
 * @see {@link UuidArrayDTO}
 * @see {@link UuidArrayVO}
 */
export const UuidArraySchema = Schema.make(UuidArrayDTO);
