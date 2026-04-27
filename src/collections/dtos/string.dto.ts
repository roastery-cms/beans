import { t } from "@roastery/terroir";

/**
 * TypeBox schema for non-empty strings (`minLength: 1`).
 *
 * The companion {@link DefinedStringVO} reuses this DTO and {@link StringSchema}
 * — there are no dedicated `defined-string.dto.ts` / `defined-string.schema.ts`
 * files because the value-object is a *semantic alias* for "non-empty string"
 * rather than a structurally different shape.
 *
 * @see {@link StringSchema}
 * @see {@link DefinedStringVO}
 */
export const StringDTO = t.String({
	minLength: 1,
	description: "A non-empty string value.",
	examples: ["Hello World"],
});

/** Static type of {@link StringDTO} — equivalent to `string`. */
export type StringDTO = t.Static<typeof StringDTO>;
