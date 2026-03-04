import { t } from "@roastery/terroir";
import { SlugDTO } from "./slug.dto";

export const SlugObjectDTO = t.Object(
	{
		slug: SlugDTO,
	},
	{
		description: "Query parameters for retrieving a resource by its slug.",
		examples: [{ slug: "my-cool-post" }],
	},
);

export type SlugObjectDTO = t.Static<typeof SlugObjectDTO>;
