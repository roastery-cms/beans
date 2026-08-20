import { optionalVO } from "../custom";
import { DoubleSchema } from "../../schemas";
import { toDouble } from "../helpers/to-double";

/**
 * {@link DoubleVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link DoubleSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `DoubleVO`'s own `42.5`.
 *
 * The `transform` hook mirrors `DoubleVO`'s own: a real number is still
 * rounded to two decimal places before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `DoubleVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalDoubleVO(undefined, { name: "price", source: "product" }).value; // undefined
 * new OptionalDoubleVO(7.5, { name: "price", source: "product" }).value;
 * new OptionalDoubleVO(1234.5678, { name: "price", source: "product" }).value; // 1234.57
 * ```
 */
export const OptionalDoubleVO = optionalVO(DoubleSchema, {
	name: "OptionalDoubleVO",
	transform: (value) => (value === undefined ? value : toDouble(value)),
});
