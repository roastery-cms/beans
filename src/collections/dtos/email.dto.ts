import { t } from "@roastery/terroir";

export const EmailDTO = t.String({
	format: "email",
	description: "A valid email address.",
	examples: ["user@example.com"],
});

export type EmailDTO = t.Static<typeof EmailDTO>;
