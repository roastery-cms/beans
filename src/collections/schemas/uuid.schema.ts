import { UuidDTO } from "@/collections/dtos/uuid.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link UuidDTO}.
 *
 * Accepts UUIDs of any version. The companion {@link UuidVO.generate} factory
 * produces v7 specifically (time-sortable) for entity ids.
 *
 * @example
 * ```ts
 * import { UuidSchema } from "@roastery/beans/collections";
 *
 * UuidSchema.match("550e8400-e29b-41d4-a716-446655440000"); // true
 * UuidSchema.match("not-a-uuid");                            // false
 * ```
 *
 * @see {@link UuidDTO}
 * @see {@link UuidVO}
 */
export const UuidSchema = Schema.make(UuidDTO);
