import { optionalVO } from "../custom";
import { NegativeDoubleSchema } from "../../schemas";
import { toDouble } from "../helpers/to-double";

/**
 * {@link NegativeDoubleVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link NegativeDoubleSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `NegativeDoubleVO`'s own `-42.5`.
 *
 * The `transform` hook mirrors `NegativeDoubleVO`'s own: a real number is still
 * rounded to two decimal places before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `NegativeDoubleVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalNegativeDoubleVO(undefined, { name: "discount", source: "invoice" }).value; // undefined
 * new OptionalNegativeDoubleVO(-7.5, { name: "discount", source: "invoice" }).value;
 * new OptionalNegativeDoubleVO(1234.5678, { name: "discount", source: "invoice" }).value; // 1234.57
 * ```
 */
export const OptionalNegativeDoubleVO = optionalVO(NegativeDoubleSchema, {
	name: "OptionalNegativeDoubleVO",
	transform: (value) => (value === undefined ? value : toDouble(value)),
});
