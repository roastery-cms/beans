import { nullableVO } from "../custom";
import { IntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link IntegerVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link IntegerSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `IntegerVO`'s own `42`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `IntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`nullableVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `null` passes through untouched.
 *
 * @see `IntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableIntegerVO(null, { name: "quantity", source: "order" }).value; // null
 * new NullableIntegerVO(7, { name: "quantity", source: "order" }).value;
 * new NullableIntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * ```
 */
export const NullableIntegerVO = nullableVO(IntegerSchema, {
	name: "NullableIntegerVO",
	transform: (value) => (value === null ? value : toInteger(value)),
});
