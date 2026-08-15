import type { t } from "@roastery/terroir";

/**
 * Structural stand-in for any `Entity` instance: something that serializes via
 * `toJSON()` and exposes its aggregate `schema`.
 *
 * Kept structural (instead of referencing the `Entity` class) so the type
 * layer never depends on the class module — the runtime discriminant is
 * `instanceof Entity`, applied inside the class module itself.
 *
 * @see {@link AnyEntityClass} — the matching class-side type.
 */
export type AnyEntity = {
	toJSON(): object;
	readonly schema: t.TSchema;
};
