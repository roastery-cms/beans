import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for email-address strings.
 *
 * Validation is delegated to the `"email"` format registered in
 * `@roastery/terroir/schema/formats`. The format is permissive (it does not
 * verify deliverability or DNS) and follows the JSON Schema email convention.
 */
export const EmailSchema = t.String({
	format: "email",
	description: "A valid email address.",
	examples: ["user@example.com"],
});

/** Static type of {@link EmailSchema} — equivalent to `string`. */
export type EmailSchema = ToDTO<typeof EmailSchema>;
