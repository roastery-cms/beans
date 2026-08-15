import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for strings, with **no length constraint** — `""` is a valid
 * value.
 *
 * The companion {@link StringVO} reuses this schema directly, since the
 * value-object adds semantics rather than a structurally different shape.
 *
 * When a property must not be empty, this is not the schema for it: reach for
 * one that carries the constraint ({@link SlugSchema}, {@link EmailSchema}) or
 * declare it on the domain's own value-object.
 *
 * @see {@link StringVO}
 */
export const StringSchema = t.String({
	description: "A string value of any length.",
	examples: ["Hello World"],
});

/** Static type of {@link StringSchema} — equivalent to `string`. */
export type StringSchema = ToDTO<typeof StringSchema>;
