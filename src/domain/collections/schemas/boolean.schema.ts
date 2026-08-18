import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema accepting any `boolean` value.
 *
 * No additional constraints — both `true` and `false` are valid. Use {@link BooleanVO}
 * for the wrapped value-object.
 *
 * @see {@link BooleanVO}
 */
export const BooleanSchema = t.Boolean({
	description: "A boolean value.",
	examples: [true, false],
});

/** Static type of {@link BooleanSchema} — equivalent to `boolean`. */
export type BooleanSchema = ToDTO<typeof BooleanSchema>;
