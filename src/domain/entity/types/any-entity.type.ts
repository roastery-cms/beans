import type { t } from "@roastery/terroir";
import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Structural stand-in for any `Entity` instance: something that serializes via
 * `toJSON()`, exposes its aggregate `schema`, and can have its domain-event
 * buffer drained — the three things the base's own traversals need from a
 * nested entity (`toJSON`, `schema` and a deep `pullDomainEvents`).
 *
 * Kept structural (instead of referencing the `Entity` class) so the type
 * layer never depends on the class module — the runtime discriminant is
 * `instanceof Entity`, applied inside the class module itself.
 *
 * @see {@link AnyEntityClass} — the matching class-side type.
 */
export type AnyEntity = {
	toJSON(): object;
	toSafeJSON(): object;
	readonly schema: t.TSchema;
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
};
