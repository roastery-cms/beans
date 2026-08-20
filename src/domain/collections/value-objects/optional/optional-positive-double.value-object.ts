import { optionalVO } from "../custom";
import { PositiveDoubleSchema } from "../../schemas";
import { toDouble } from "../helpers/to-double";

/**
 * {@link PositiveDoubleVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link PositiveDoubleSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `PositiveDoubleVO`'s own `42.5`.
 *
 * The `transform` hook mirrors `PositiveDoubleVO`'s own: a real number is still
 * rounded to two decimal places before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `PositiveDoubleVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalPositiveDoubleVO(undefined, { name: "price", source: "product" }).value; // undefined
 * new OptionalPositiveDoubleVO(7.5, { name: "price", source: "product" }).value;
 * new OptionalPositiveDoubleVO(1234.5678, { name: "price", source: "product" }).value; // 1234.57
 * ```
 */
export const OptionalPositiveDoubleVO = optionalVO(PositiveDoubleSchema, {
	name: "OptionalPositiveDoubleVO",
	transform: (value) => (value === undefined ? value : toDouble(value)),
});
