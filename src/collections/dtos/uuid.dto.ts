import { t } from "@roastery/terroir";

export const UuidDTO = t.String({
	format: "uuid",
	description: "The unique UUID identifier of the resource to query.",
	examples: ["550e8400-e29b-41d4-a716-446655440000"],
});

export type UuidDTO = t.Static<typeof UuidDTO>;
