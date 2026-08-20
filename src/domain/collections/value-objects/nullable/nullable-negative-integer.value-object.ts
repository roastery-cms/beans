import { nullableVO } from "../custom";
import { NegativeIntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link NegativeIntegerVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link NegativeIntegerSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `NegativeIntegerVO`'s own `-42`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `NegativeIntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`nullableVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `null` passes through untouched.
 *
 * @see `NegativeIntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableNegativeIntegerVO(null, { name: "adjustment", source: "ledger" }).value; // null
 * new NullableNegativeIntegerVO(-7, { name: "adjustment", source: "ledger" }).value;
 * new NullableNegativeIntegerVO(2.7, { name: "adjustment", source: "ledger" }).value; // 2
 * ```
 */
export const NullableNegativeIntegerVO = nullableVO(NegativeIntegerSchema, {
	name: "NullableNegativeIntegerVO",
	transform: (value) => (value === null ? value : toInteger(value)),
});
