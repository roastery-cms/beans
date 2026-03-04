import { t } from "@roastery/terroir";

export const EntityDTO = t.Object(
	{
		id: t.String({ format: "uuid", description: "Entity's Id" }),
		createdAt: t.String({
			format: "date-time",
			description: "When Entity was Created.",
		}),
		updatedAt: t.Optional(
			t.String({
				format: "date-time",
				description: "When Entity was Updated.",
			}),
		),
	},
	{
		description:
			"Base entity structure containing common fields like ID and timestamps.",
		examples: [
			{
				id: "550e8400-e29b-41d4-a716-446655440000",
				createdAt: "2024-01-01T12:00:00Z",
				updatedAt: "2024-01-02T12:00:00Z",
			},
		],
	},
);

export type EntityDTO = t.Static<typeof EntityDTO>;
