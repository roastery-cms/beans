import { EmailDTO } from "@/collections/dtos/email.dto";
import { Schema } from "@roastery/terroir/schema";

/**
 * Runtime `Schema` instance wrapping {@link EmailDTO}.
 *
 * @example
 * ```ts
 * import { EmailSchema } from "@roastery/beans/collections";
 *
 * EmailSchema.match("user@example.com"); // true
 * EmailSchema.match("not-an-email");     // false
 * ```
 *
 * @see {@link EmailDTO}
 */
export const EmailSchema = Schema.make(EmailDTO);
