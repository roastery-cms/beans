import { t } from "@roastery/terroir";

export const NumberDTO = t.Number({
	minimum: 0,
	description: "A non-negative numeric value.",
	examples: [42],
});

export type NumberDTO = t.Static<typeof NumberDTO>;
