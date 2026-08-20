import { nullableVO } from "../custom";
import { PositiveIntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link PositiveIntegerVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link PositiveIntegerSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `PositiveIntegerVO`'s own `42`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `transform` hook mirrors `PositiveIntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`nullableVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `null` passes through untouched.
 *
 * @see `PositiveIntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullablePositiveIntegerVO(null, { name: "quantity", source: "order" }).value; // null
 * new NullablePositiveIntegerVO(7, { name: "quantity", source: "order" }).value;
 * new NullablePositiveIntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * ```
 */
export const NullablePositiveIntegerVO = nullableVO(PositiveIntegerSchema, {
	name: "NullablePositiveIntegerVO",
	transform: (value) => (value === null ? value : toInteger(value)),
});
