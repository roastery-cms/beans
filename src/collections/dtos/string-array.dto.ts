import { t } from "@roastery/terroir";

export const StringArrayDTO = t.Array(t.String(), {
	description: "A list of string values.",
	examples: [["item1", "item2"]],
});

export type StringArrayDTO = t.Static<typeof StringArrayDTO>;
