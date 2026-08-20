import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for whole numbers less than or equal to zero.
 *
 * `IntegerSchema` with `maximum: 0`. Accepts `0` itself — read it as
 * "non-positive" rather than "strictly negative".
 */
export const NegativeIntegerSchema = t.Integer({
	maximum: 0,
	description: "A whole number less than or equal to zero.",
	examples: [-42],
});

/** Static type of {@link NegativeIntegerSchema} — equivalent to `number`. */
export type NegativeIntegerSchema = ToDTO<typeof NegativeIntegerSchema>;
