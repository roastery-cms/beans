import { NumberDTO } from "@/collections/dtos/number.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link NumberDTO}.
 *
 * @example
 * ```ts
 * import { NumberSchema } from "@roastery/beans/collections";
 *
 * NumberSchema.match(42);   // true
 * NumberSchema.match(-1);   // false (negative)
 * NumberSchema.match("42"); // false (not a number)
 * ```
 *
 * @see {@link NumberDTO}
 */
export const NumberSchema = Schema.make(NumberDTO);
