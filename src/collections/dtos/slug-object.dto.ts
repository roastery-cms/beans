import { t } from "@roastery/terroir";
import { SlugDTO } from "./slug.dto";

/**
 * Object-shaped DTO carrying a single `slug` field of type {@link SlugDTO}.
 *
 * Useful as a route/query-parameter contract for endpoints that look up a
 * resource by slug (`GET /:slug`-style). Composes the slug validation rules
 * of {@link SlugDTO}.
 *
 * @see {@link SlugObjectSchema}
 * @see {@link IdObjectDTO} — UUID-keyed counterpart.
 */
export const SlugObjectDTO = t.Object(
	{
		slug: SlugDTO,
	},
	{
		description: "Query parameters for retrieving a resource by its slug.",
		examples: [{ slug: "my-cool-post" }],
	},
);

/** Static type of {@link SlugObjectDTO} — `{ slug: string }`. */
export type SlugObjectDTO = t.Static<typeof SlugObjectDTO>;
