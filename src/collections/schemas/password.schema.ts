import { PasswordDTO } from "@/collections/dtos/password.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link PasswordDTO}.
 *
 * Enforces the four-category complexity rules of {@link PasswordDTO} (lower-case,
 * upper-case, digit, non-word) plus a minimum length of seven characters.
 *
 * @example
 * ```ts
 * import { PasswordSchema } from "@roastery/beans/collections";
 *
 * PasswordSchema.match("StrongPass1!"); // true
 * PasswordSchema.match("weakpass");     // false (no upper-case, no digit, no special)
 * ```
 *
 * @see {@link PasswordDTO}
 */
export const PasswordSchema = Schema.make(PasswordDTO);
