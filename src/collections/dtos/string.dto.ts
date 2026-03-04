import { t } from "@roastery/terroir";

export const StringDTO = t.String({
	minLength: 1,
	description: "A non-empty string value.",
	examples: ["Hello World"],
});

export type StringDTO = t.Static<typeof StringDTO>;
