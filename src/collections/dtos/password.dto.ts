import { t } from "@roastery/terroir";

/**
 * TypeBox schema for password strings, enforcing a baseline of complexity.
 *
 * Validation rules:
 * - `minLength: 7` — at least seven characters total.
 * - `pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$` — must contain at
 *   least one lower-case letter, one upper-case letter, one digit, and one
 *   non-word character (or underscore).
 *
 * The pattern is a lookahead-only regex against the whole string, so any
 * additional characters are allowed past the four mandatory categories.
 *
 * @see {@link PasswordSchema}
 */
export const PasswordDTO = t.String({
	title: "Password",
	minLength: 7,
	pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$",
	description:
		"User password. Must have at least 7 characters, including upper/lowercase letters, numbers, and special characters.",
	examples: ["StrongPass1!", "My$ecureP@ss7"],
});

/** Static type of {@link PasswordDTO} — equivalent to `string`. */
export type PasswordDTO = t.Static<typeof PasswordDTO>;
