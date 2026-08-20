import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for whole numbers greater than or equal to zero.
 *
 * `IntegerSchema` with `minimum: 0`. Accepts `0` itself — read it as
 * "non-negative" rather than "strictly positive".
 */
export const PositiveIntegerSchema = t.Integer({
	minimum: 0,
	description: "A whole number greater than or equal to zero.",
	examples: [42],
});

/** Static type of {@link PositiveIntegerSchema} — equivalent to `number`. */
export type PositiveIntegerSchema = ToDTO<typeof PositiveIntegerSchema>;
