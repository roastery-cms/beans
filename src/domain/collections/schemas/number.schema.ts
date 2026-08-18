import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for non-negative numbers (`>= 0`).
 *
 * Accepts both integers and floats; reject negatives via the `minimum: 0`
 * constraint. Use a custom schema if a different lower bound is required.
 */
export const NumberSchema = t.Number({
	minimum: 0,
	description: "A non-negative numeric value.",
	examples: [42],
});

/** Static type of {@link NumberSchema} — equivalent to `number`. */
export type NumberSchema = ToDTO<typeof NumberSchema>;
