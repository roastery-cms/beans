import { t } from "@roastery/terroir";

/**
 * TypeBox schema for ISO 8601 date-time strings.
 *
 * Validation is delegated to the `"date-time"` format registered in
 * `@roastery/terroir/schema/formats` (side-effect-imported by the DTOs barrel).
 * Both UTC (`Z` suffix) and offset (`±HH:MM`) forms are accepted.
 *
 * @see {@link DateTimeSchema}
 * @see {@link DateTimeVO} — also exposes a `now()` factory.
 */
export const DateTimeDTO = t.String({
	format: "date-time",
	description: "A valid ISO 8601 date-time string.",
	examples: ["2023-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
});

/** Static type of {@link DateTimeDTO} — equivalent to `string`. */
export type DateTimeDTO = t.Static<typeof DateTimeDTO>;
