import type { AnyRecord } from "./any-record.type";

/**
 * Widest `DomainRecord` **class** type: something whose instances serialize
 * and whose constructor takes a raw context payload — with no identity half,
 * unlike an entity's.
 *
 * One of the four shapes a blueprint value may have. The discriminant against
 * `AnyEntityClass` is the identity fields {@link AnyRecord} declares as
 * `?: never`; against `AnyValueObjectClass`, the presence of `toJSON` on the
 * prototype; against `AnyWrapperClass`, the `wraps?: never` below.
 *
 * **`wraps` is declared on the class, not the instance, and that is
 * deliberate.** A record instance would be structurally indistinguishable from
 * a wrapper one — both carry `toJSON`, `toSafeJSON`, `schema` and
 * `pullDomainEvents`, and `unwrap` is a method a record is free to declare —
 * so the disjunction has to live where a blueprint key cannot reach: blueprint
 * keys become *instance* accessors, never statics.
 *
 * @see `AnyPropertyClass` in `@/domain/entity/types` — the union this belongs to.
 * @see `AnyWrapperClass` in `@/domain/wrapper/types` — the sibling `wraps`
 *   makes this disjoint from.
 */
export type AnyRecordClass = {
	readonly prototype: AnyRecord;
	new (context: never): AnyRecord;
	readonly wraps?: never;
};
