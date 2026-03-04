import { t } from "@roastery/terroir";

export const UrlDTO = t.String({
	description: "The URL or path to the cover image of the post.",
	examples: ["https://example.com/cover.jpg"],
	format: "url",
});

export type UrlDTO = t.Static<typeof UrlDTO>;
