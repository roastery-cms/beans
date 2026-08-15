import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";
import { UuidSchema } from "./uuid.schema";

/**
 * TypeBox schema for arrays of UUID strings.
 *
 * Each element is validated against {@link UuidSchema}. No `minItems` / `maxItems`
 * constraints — empty arrays are accepted.
 *
 * @see {@link UuidArrayVO}
 */
export const UuidArraySchema = t.Array(UuidSchema, {
	description: "A list of UUID values.",
	examples: [["550e8400-e29b-41d4-a716-446655440000"]],
});

/** Static type of {@link UuidArraySchema} — equivalent to `string[]`. */
export type UuidArraySchema = ToDTO<typeof UuidArraySchema>;
