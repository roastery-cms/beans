import { BooleanDTO } from "@/collections/dtos";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link BooleanDTO}.
 *
 * Singleton — instantiated at module load so every consumer (notably {@link BooleanVO})
 * shares the same compiled validator.
 *
 * @example
 * ```ts
 * import { BooleanSchema } from "@roastery/beans/collections";
 *
 * BooleanSchema.match(true);  // true
 * BooleanSchema.match("yes"); // false
 * ```
 *
 * @see {@link BooleanDTO}
 * @see {@link BooleanVO}
 */
export const BooleanSchema = Schema.make(BooleanDTO);
