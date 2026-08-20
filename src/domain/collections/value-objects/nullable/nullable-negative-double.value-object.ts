import { nullableVO } from "../custom";
import { NegativeDoubleSchema } from "../../schemas";
import { toDouble } from "../helpers/to-double";

/**
 * {@link NegativeDoubleVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link NegativeDoubleSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `NegativeDoubleVO`'s own `-42.5`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `NegativeDoubleVO`'s own: a real number is still
 * rounded to two decimal places before validation
 * (`nullableVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `null` passes through untouched.
 *
 * @see `NegativeDoubleVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableNegativeDoubleVO(null, { name: "discount", source: "invoice" }).value; // null
 * new NullableNegativeDoubleVO(-7.5, { name: "discount", source: "invoice" }).value;
 * new NullableNegativeDoubleVO(1234.5678, { name: "discount", source: "invoice" }).value; // 1234.57
 * ```
 */
export const NullableNegativeDoubleVO = nullableVO(NegativeDoubleSchema, {
	name: "NullableNegativeDoubleVO",
	transform: (value) => (value === null ? value : toDouble(value)),
});
