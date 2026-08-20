import { nullableVO } from "../custom";
import { DoubleSchema } from "../../schemas";
import { toDouble } from "../helpers/to-double";

/**
 * {@link DoubleVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link DoubleSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `DoubleVO`'s own `42.5`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `DoubleVO`'s own: a real number is still
 * rounded to two decimal places before validation
 * (`nullableVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `null` passes through untouched.
 *
 * @see `DoubleVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableDoubleVO(null, { name: "price", source: "product" }).value; // null
 * new NullableDoubleVO(7.5, { name: "price", source: "product" }).value;
 * new NullableDoubleVO(1234.5678, { name: "price", source: "product" }).value; // 1234.57
 * ```
 */
export const NullableDoubleVO = nullableVO(DoubleSchema, {
	name: "NullableDoubleVO",
	transform: (value) => (value === null ? value : toDouble(value)),
});
