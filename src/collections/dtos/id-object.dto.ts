import { t } from "@roastery/terroir";
import { UuidDTO } from "./uuid.dto";

export const IdObjectDTO = t.Object(
	{
		id: UuidDTO,
	},
	{
		description: "Query parameters for retrieving a resource by its UUID.",
		examples: [{ uuid: "550e8400-e29b-41d4-a716-446655440000" }],
	},
);

export type IdObjectDTO = t.Static<typeof IdObjectDTO>;
