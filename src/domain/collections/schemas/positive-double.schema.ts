import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for fixed-precision decimal numbers greater than or
 * equal to zero.
 *
 * `DoubleSchema` with `minimum: 0`. Accepts `0` itself — read it as
 * "non-negative" rather than "strictly positive".
 */
export const PositiveDoubleSchema = t.Number({
	minimum: 0,
	description:
		"A fixed-precision decimal number greater than or equal to zero.",
	examples: [42.5],
});

/** Static type of {@link PositiveDoubleSchema} — equivalent to `number`. */
export type PositiveDoubleSchema = ToDTO<typeof PositiveDoubleSchema>;
