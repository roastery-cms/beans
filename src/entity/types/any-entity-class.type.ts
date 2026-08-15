import type { AnyEntity } from "./any-entity.type";

/**
 * Widest `Entity` **class** type: something whose instances serialize and
 * whose constructor takes a raw context payload.
 *
 * One of the two shapes a blueprint value may have — the discriminant against
 * {@link AnyValueObjectClass} is the presence of `toJSON` on the prototype.
 *
 * @see {@link AnyPropertyClass} — the union this type belongs to.
 */
export type AnyEntityClass = {
	readonly prototype: AnyEntity;
	new (context: never): AnyEntity;
};
