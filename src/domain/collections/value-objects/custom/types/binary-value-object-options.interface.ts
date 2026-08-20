import type { t } from "@roastery/terroir";

/**
 * Options accepted by `customBinaryVO` — TypeBox's own string options, plus
 * the two bounds that only make sense once the string is read as binary data.
 *
 * `minBytes`/`maxBytes` are **not** lowered into `minLength`/`maxLength`: a
 * four-character base64 group carries one, two or three bytes depending on its
 * padding, so a length-derived bound would be off by up to two bytes. They are
 * checked against the exact decoded size instead, in the generated class's
 * `validate` — which is also why a default violating them is checked by the
 * factory itself rather than by the schema.
 *
 * @see `customBinaryVO` — the factory reading these.
 * @see {@link ICustomValueObjectArgs} — where this lands, under `options`.
 *
 * @example
 * ```ts
 * const Avatar = customBinaryVO({ options: { maxBytes: 1_048_576 } });
 * ```
 */
export interface IBinaryValueObjectOptions extends t.StringOptions {
	/** Largest payload accepted, in decoded bytes. */
	readonly maxBytes?: number;

	/** Smallest payload accepted, in decoded bytes. */
	readonly minBytes?: number;
}
