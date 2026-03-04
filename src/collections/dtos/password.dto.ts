import { t } from "@roastery/terroir";

export const PasswordDTO = t.String({
	title: "Password",
	minLength: 7,
	pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$",
	description:
		"User password. Must have at least 7 characters, including upper/lowercase letters, numbers, and special characters.",
	examples: ["StrongPass1!", "My$ecureP@ss7"],
});

export type PasswordDTO = t.Static<typeof PasswordDTO>;
