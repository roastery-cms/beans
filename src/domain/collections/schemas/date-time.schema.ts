import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for ISO 8601 date-time strings.
 *
 * Validation is delegated to the `"date-time"` format registered in
 * `@roastery/terroir/schema/formats` (side-effect-imported by the schemas barrel).
 * Both UTC (`Z` suffix) and offset (`±HH:MM`) forms are accepted.
 *
 * @see {@link DateTimeVO} — also exposes a `now()` factory.
 */
export const DateTimeSchema = t.String({
	format: "date-time",
	description: "A valid ISO 8601 date-time string.",
	examples: ["2023-01-01T00:00:00.000Z", "2023-12-31T23:59:59.999Z"],
});

/** Static type of {@link DateTimeSchema} — equivalent to `string`. */
export type DateTimeSchema = ToDTO<typeof DateTimeSchema>;
