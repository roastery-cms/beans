import type { IValueObjectContext } from "@/value-object/types";
import type { AnyValueObject } from "./any-value-object.type";

/**
 * Widest `ValueObject` **class** type: something whose instances are
 * value-objects and whose constructor takes a value plus an identification
 * context.
 *
 * One of the two shapes a blueprint value may have — the discriminant against
 * {@link AnyEntityClass} is the presence of `toJSON` on the prototype.
 *
 * @see {@link AnyPropertyClass} — the union this type belongs to.
 */
export type AnyValueObjectClass = {
	readonly prototype: AnyValueObject;
	new (value: never, context: IValueObjectContext): AnyValueObject;
};
