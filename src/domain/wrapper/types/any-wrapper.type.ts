import type { IDomainEvent } from "@/domain/domain-event/types";
import type { t } from "@roastery/terroir";

/**
 * Structural stand-in for any multiplicity-wrapper instance: a container that
 * serializes, exposes its derived `schema`, forwards a deep domain-event drain
 * to whatever it holds, and hands back its contents through `unwrap()`.
 *
 * **This type is deliberately *not* the disjunction site.** A wrapper carries
 * `toJSON`, `toSafeJSON`, `schema` and `pullDomainEvents` exactly as a record
 * does, and declaring the identity fields as `?: never` here — which it does,
 * mirroring `AnyRecord` — is not enough to tell the two apart, since `unwrap`
 * is a method a record could perfectly well declare too. The disjunction lives
 * on the **class** side instead: `AnyEntityClass` and `AnyRecordClass` declare
 * `readonly wraps?: never`, which no wrapper class can satisfy. Static of
 * purpose: blueprint keys become *instance* accessors, so a `wraps?: never` on
 * the class can never be shadowed by a key called `wraps`, unlike the `?: never`
 * idiom used on `AnyRecord` itself.
 *
 * @see {@link AnyWrapperClass} — the matching class-side type, where the
 *   disjunction against entity and record actually lives.
 * @see `AnyRecord` in `@/domain/record/types` — the sibling it reads like.
 */
export type AnyWrapper = {
	toJSON(): unknown;
	toSafeJSON(): unknown;
	unwrap(): unknown;
	readonly schema: t.TSchema;
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
	readonly id?: never;
	readonly createdAt?: never;
	readonly updatedAt?: never;
};
