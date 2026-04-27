import { t } from "@roastery/terroir";
import { UuidDTO } from "./uuid.dto";

/**
 * TypeBox schema for arrays of UUID strings.
 *
 * Each element is validated against {@link UuidDTO}. No `minItems` / `maxItems`
 * constraints — empty arrays are accepted.
 *
 * @see {@link UuidArraySchema}
 * @see {@link UuidArrayVO}
 */
export const UuidArrayDTO = t.Array(UuidDTO, {
	description: "A list of UUID values.",
	examples: [["550e8400-e29b-41d4-a716-446655440000"]],
});

/** Static type of {@link UuidArrayDTO} — equivalent to `string[]`. */
export type UuidArrayDTO = t.Static<typeof UuidArrayDTO>;
