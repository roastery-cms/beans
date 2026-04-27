import { t } from "@roastery/terroir";

/**
 * TypeBox schema accepting any `boolean` value.
 *
 * No additional constraints — both `true` and `false` are valid. Use {@link BooleanSchema}
 * for the runtime `Schema` instance, and {@link BooleanVO} for the wrapped value-object.
 *
 * @see {@link BooleanSchema}
 * @see {@link BooleanVO}
 */
export const BooleanDTO = t.Boolean({
	description: "A boolean value.",
	examples: [true, false],
});

/** Static type of {@link BooleanDTO} — equivalent to `boolean`. */
export type BooleanDTO = t.Static<typeof BooleanDTO>;
