import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for numbers less than or equal to zero (`<= 0`).
 *
 * Accepts both integers and floats, and accepts `0` itself — read it as
 * "non-positive" rather than "strictly negative". Its counterpart,
 * `PositiveNumberSchema`, also accepts `0`, so the two overlap at exactly one
 * value; `NumberSchema` is the unbounded form.
 */
export const NegativeNumberSchema = t.Number({
	maximum: 0,
	description: "A number less than or equal to zero.",
	examples: [-42],
});

/** Static type of {@link NegativeNumberSchema} — equivalent to `number`. */
export type NegativeNumberSchema = ToDTO<typeof NegativeNumberSchema>;
