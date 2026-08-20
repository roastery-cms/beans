import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for fixed-precision decimal numbers of either sign.
 *
 * Structurally identical to `NumberSchema` — JSON Schema has no way to say
 * "floating point", and `2.0` is not representable as distinct from `2` in
 * JavaScript. What separates a `Double*VO` from a `Number*VO` is therefore
 * the VO's `transform`, which rounds to a fixed number of decimal places,
 * not the schema. The name is what tells an adapter to pick a
 * `DOUBLE PRECISION`/`NUMERIC` column rather than an integer one.
 */
export const DoubleSchema = t.Number({
	description: "A fixed-precision decimal number, of either sign.",
	examples: [42.5],
});

/** Static type of {@link DoubleSchema} — equivalent to `number`. */
export type DoubleSchema = ToDTO<typeof DoubleSchema>;
