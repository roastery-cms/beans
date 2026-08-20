import { optionalVO } from "../custom";
import { PositiveIntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link PositiveIntegerVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link PositiveIntegerSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `PositiveIntegerVO`'s own `42`.
 *
 * The `transform` hook mirrors `PositiveIntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `PositiveIntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalPositiveIntegerVO(undefined, { name: "quantity", source: "order" }).value; // undefined
 * new OptionalPositiveIntegerVO(7, { name: "quantity", source: "order" }).value;
 * new OptionalPositiveIntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * ```
 */
export const OptionalPositiveIntegerVO = optionalVO(PositiveIntegerSchema, {
	name: "OptionalPositiveIntegerVO",
	transform: (value) => (value === undefined ? value : toInteger(value)),
});
