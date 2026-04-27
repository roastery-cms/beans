import { t } from "@roastery/terroir";

/**
 * TypeBox schema for email-address strings.
 *
 * Validation is delegated to the `"email"` format registered in
 * `@roastery/terroir/schema/formats`. The format is permissive (it does not
 * verify deliverability or DNS) and follows the JSON Schema email convention.
 *
 * @see {@link EmailSchema}
 */
export const EmailDTO = t.String({
	format: "email",
	description: "A valid email address.",
	examples: ["user@example.com"],
});

/** Static type of {@link EmailDTO} — equivalent to `string`. */
export type EmailDTO = t.Static<typeof EmailDTO>;
