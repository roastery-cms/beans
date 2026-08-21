import type { AnyRecord } from "./any-record.type";

/**
 * Widest `DomainRecord` **class** type: something whose instances serialize
 * and whose constructor takes a raw context payload — with no identity half,
 * unlike an entity's.
 *
 * One of the three shapes a blueprint value may have. The discriminant against
 * `AnyEntityClass` is the identity fields {@link AnyRecord} declares as
 * `?: never`; against `AnyValueObjectClass`, the presence of `toJSON` on the
 * prototype.
 *
 * @see `AnyPropertyClass` in `@/domain/entity/types` — the union this belongs to.
 */
export type AnyRecordClass = {
	readonly prototype: AnyRecord;
	new (context: never): AnyRecord;
};
