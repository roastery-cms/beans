import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for fixed-precision decimal numbers less than or equal
 * to zero.
 *
 * `DoubleSchema` with `maximum: 0`. Accepts `0` itself — read it as
 * "non-positive" rather than "strictly negative".
 */
export const NegativeDoubleSchema = t.Number({
	maximum: 0,
	description: "A fixed-precision decimal number less than or equal to zero.",
	examples: [-42.5],
});

/** Static type of {@link NegativeDoubleSchema} — equivalent to `number`. */
export type NegativeDoubleSchema = ToDTO<typeof NegativeDoubleSchema>;
