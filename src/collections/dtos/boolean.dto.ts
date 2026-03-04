import { t } from "@roastery/terroir";

export const BooleanDTO = t.Boolean({
	description: "A boolean value.",
	examples: [true, false],
});

export type BooleanDTO = t.Static<typeof BooleanDTO>;
