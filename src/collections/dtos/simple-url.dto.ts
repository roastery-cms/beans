import { t } from "@roastery/terroir";

export const SimpleUrlDTO = t.String({
	description: "The Simple URL or path to the cover image of the post.",
	examples: ["redis://localhost:6739"],
	format: "simple-url",
});

export type SimpleUrlDTO = t.Static<typeof SimpleUrlDTO>;
