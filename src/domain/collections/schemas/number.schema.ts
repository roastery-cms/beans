import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for numbers of any sign.
 *
 * Accepts integers and floats, positive, negative and zero — the unconstrained
 * form. Reach for `PositiveNumberSchema` or `NegativeNumberSchema` when the
 * sign is part of the invariant, `IntegerSchema` when the value must be whole,
 * or `customNumberVO({ options: { … } })` for any other bound.
 */
export const NumberSchema = t.Number({
	description: "A numeric value of any sign.",
	examples: [42],
});

/** Static type of {@link NumberSchema} — equivalent to `number`. */
export type NumberSchema = ToDTO<typeof NumberSchema>;
