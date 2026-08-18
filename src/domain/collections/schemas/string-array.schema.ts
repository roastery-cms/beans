import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for arrays of unconstrained strings.
 *
 * No `minItems` / `maxItems` constraints — empty arrays are accepted and
 * individual elements may be the empty string. If you need non-empty entries,
 * compose a stricter inner schema and a fresh `t.Array(...)`.
 *
 * @see {@link StringArrayVO}
 */
export const StringArraySchema = t.Array(t.String(), {
	description: "A list of string values.",
	examples: [["item1", "item2"]],
});

/** Static type of {@link StringArraySchema} — equivalent to `string[]`. */
export type StringArraySchema = ToDTO<typeof StringArraySchema>;
