import { t } from "@roastery/terroir";

/**
 * TypeBox schema for non-negative numbers (`>= 0`).
 *
 * Accepts both integers and floats; reject negatives via the `minimum: 0`
 * constraint. Use a custom DTO if a different lower bound is required.
 *
 * @see {@link NumberSchema}
 */
export const NumberDTO = t.Number({
	minimum: 0,
	description: "A non-negative numeric value.",
	examples: [42],
});

/** Static type of {@link NumberDTO} — equivalent to `number`. */
export type NumberDTO = t.Static<typeof NumberDTO>;
