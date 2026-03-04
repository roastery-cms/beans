import { t } from "@roastery/terroir";

export const SlugDTO = t.String({
	description: "The unique slug identifier of the resource to query.",
	examples: ["my-cool-post"],
	format: "slug",
	minLength: 1,
});

export type SlugDTO = t.Static<typeof SlugDTO>;
