import { DateTimeDTO } from "@/collections/dtos/date-time.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link DateTimeDTO}.
 *
 * @example
 * ```ts
 * import { DateTimeSchema } from "@roastery/beans/collections";
 *
 * DateTimeSchema.match("2026-04-27T10:00:00.000Z"); // true
 * DateTimeSchema.match("April 27th, 2026");         // false
 * ```
 *
 * @see {@link DateTimeDTO}
 * @see {@link DateTimeVO}
 */
export const DateTimeSchema = Schema.make(DateTimeDTO);
