import type { ValueObject } from "@/domain/value-object";
import type { t } from "@roastery/terroir";

/**
 * Widest `ValueObject` instance type — any wrapped value, any schema.
 *
 * Used wherever the entity machinery handles a built value-object without
 * caring which concrete subclass it is.
 *
 * @see {@link AnyValueObjectClass} — the matching class-side type.
 */
export type AnyValueObject = ValueObject<unknown, t.TSchema>;
