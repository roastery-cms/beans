import type { AnyEntity } from "./any-entity.type";

/**
 * Widest `Entity` **class** type: something whose instances serialize and
 * whose constructor takes a raw context payload.
 *
 * One of the four shapes a blueprint value may have. The discriminant against
 * {@link AnyValueObjectClass} is the presence of `toJSON` on the prototype;
 * against `AnyRecordClass`, the `id: string` {@link AnyEntity} declares and
 * `AnyRecord` declares as `?: never`; against `AnyWrapperClass`, the
 * `wraps?: never` below.
 *
 * **`wraps` is declared on the class, not the instance, and that is
 * deliberate.** Blueprint keys become *instance* accessors, so a key literally
 * called `wraps` would shadow an instance-side `?: never` and quietly collapse
 * the disjunction; nothing a blueprint declares can reach the class side.
 *
 * @see {@link AnyPropertyClass} — the union this type belongs to.
 * @see `AnyWrapperClass` in `@/domain/wrapper/types` — the sibling `wraps`
 *   makes this disjoint from.
 */
export type AnyEntityClass = {
	readonly prototype: AnyEntity;
	new (context: never): AnyEntity;
	readonly wraps?: never;
};
