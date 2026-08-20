import { optionalVO } from "../custom";
import { IntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link IntegerVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link IntegerSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `IntegerVO`'s own `42`.
 *
 * The `transform` hook mirrors `IntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `IntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalIntegerVO(undefined, { name: "quantity", source: "order" }).value; // undefined
 * new OptionalIntegerVO(7, { name: "quantity", source: "order" }).value;
 * new OptionalIntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * ```
 */
export const OptionalIntegerVO = optionalVO(IntegerSchema, {
	name: "OptionalIntegerVO",
	transform: (value) => (value === undefined ? value : toInteger(value)),
});
