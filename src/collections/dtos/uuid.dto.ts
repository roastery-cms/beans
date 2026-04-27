import { t } from "@roastery/terroir";

/**
 * TypeBox schema for UUID strings (any version).
 *
 * Validation is delegated to the `"uuid"` format registered in
 * `@roastery/terroir/schema/formats`. The DTO does not pin the UUID version, so
 * callers receive the full `[1-5, 7-8]` range; the {@link UuidVO.generate}
 * factory specifically produces v7 for the entity-id use case.
 *
 * @see {@link UuidSchema}
 * @see {@link UuidVO}
 */
export const UuidDTO = t.String({
	format: "uuid",
	description: "A UUID string (any version).",
	examples: ["550e8400-e29b-41d4-a716-446655440000"],
});

/** Static type of {@link UuidDTO} — equivalent to `string`. */
export type UuidDTO = t.Static<typeof UuidDTO>;
