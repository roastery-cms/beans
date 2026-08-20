import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for numbers greater than or equal to zero (`>= 0`).
 *
 * Accepts both integers and floats, and accepts `0` itself — read it as
 * "non-negative" rather than "strictly positive". Its counterpart,
 * `NegativeNumberSchema`, also accepts `0`, so the two overlap at exactly one
 * value; `NumberSchema` is the unbounded form.
 */
export const PositiveNumberSchema = t.Number({
	minimum: 0,
	description: "A number greater than or equal to zero.",
	examples: [42],
});

/** Static type of {@link PositiveNumberSchema} — equivalent to `number`. */
export type PositiveNumberSchema = ToDTO<typeof PositiveNumberSchema>;
