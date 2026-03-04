import { t } from "@roastery/terroir";

export const DateTimeDTO = t.String({
	format: "date-time",
	description: "A valid ISO 8601 date-time string.",
	examples: ["2023-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
});

export type DateTimeDTO = t.Static<typeof DateTimeDTO>;
