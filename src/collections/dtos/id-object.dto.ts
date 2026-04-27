import { t } from "@roastery/terroir";
import { UuidDTO } from "./uuid.dto";

/**
 * Object-shaped DTO carrying a single `id` field of type {@link UuidDTO}.
 *
 * Useful as a route/query-parameter contract for endpoints that look up a
 * resource by id without any other fields (`GET /:id`-style). Composes the
 * UUID validation rules of {@link UuidDTO}.
 *
 * @see {@link IdObjectSchema}
 * @see {@link SlugObjectDTO} — slug-keyed counterpart.
 */
export const IdObjectDTO = t.Object(
	{
		id: UuidDTO,
	},
	{
		description:
			"Query parameters for retrieving a resource by its identifier.",
		examples: [{ id: "550e8400-e29b-41d4-a716-446655440000" }],
	},
);

/** Static type of {@link IdObjectDTO} — `{ id: string }`. */
export type IdObjectDTO = t.Static<typeof IdObjectDTO>;
