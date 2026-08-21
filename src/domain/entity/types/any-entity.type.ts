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
 * `defineEntity` on the prototype, applied by `isEntityClass`.
 *
 * **`id` is here as the discriminant against `AnyRecord`, not because the
 * traversals need it.** A record also carries `toJSON`, `toSafeJSON`, `schema`
 * and `pullDomainEvents`, so without `id` the two types would be structurally
 * identical and every conditional in the blueprint machinery would depend on
 * the order its branches happen to be written in. `AnyRecord` declares the
 * three identity fields as `?: never`; this declares `id` as a real `string`.
 * Together they make the two disjoint in both directions.
 *
 * @see {@link AnyEntityClass} — the matching class-side type.
 * @see `AnyRecord` in `@/domain/record/types` — the sibling it is disjoint from.
 */
export type AnyEntity = {
	readonly id: string;
	toJSON(): object;
	toSafeJSON(): object;
	readonly schema: t.TSchema;
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
};
