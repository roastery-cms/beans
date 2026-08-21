import type { t } from "@roastery/terroir";
import type { IDomainEvent } from "@/domain/domain-event/types";

/**
 * Structural stand-in for any `DomainRecord` instance: something that
 * serializes via `toJSON()`, exposes its aggregate `schema`, and can forward a
 * deep domain-event drain to whatever entities it nests.
 *
 * Kept structural (instead of referencing the `DomainRecord` class) so the
 * type layer never depends on the class module — the same reason `AnyEntity`
 * is structural, and what keeps the two pillars free of a class-level import
 * cycle.
 *
 * **The three `?: never` fields are the discriminant, not decoration.** A
 * record carries `pullDomainEvents` (it forwards, it never raises), so without
 * them this type and `AnyEntity` would be structurally identical and every
 * conditional in the blueprint machinery would silently depend on the order
 * its branches happen to be written in. Declaring the identity fields as
 * `?: never` makes `AnyEntity extends AnyRecord` and `AnyRecord extends
 * AnyEntity` both `false`, which is what turns branch order into a matter of
 * readability. It is the same mutual-exclusion idiom `PropertyRule` already
 * uses for `default` / `derive`.
 *
 * The runtime half of that guarantee is `DomainRecord` rejecting `id`,
 * `createdAt` and `updatedAt` as blueprint keys — without it a record could
 * grow an `id` accessor and break the disjunction.
 *
 * @see {@link AnyRecordClass} — the matching class-side type.
 * @see `AnyEntity` in `@/domain/entity/types` — the sibling it is disjoint from.
 */
export type AnyRecord = {
	toJSON(): object;
	toSafeJSON(): object;
	readonly schema: t.TSchema;
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
	readonly id?: never;
	readonly createdAt?: never;
	readonly updatedAt?: never;
};
