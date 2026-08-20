import { nullableVO } from "../custom";
import { NegativeNumberSchema } from "../../schemas";

/**
 * {@link NegativeNumberVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link NegativeNumberSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `NegativeNumberVO`'s own `-42`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.

 * @see `NegativeNumberVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableNegativeNumberVO(null, { name: "balance", source: "account" }).value; // null
 * new NullableNegativeNumberVO(-7, { name: "balance", source: "account" }).value;
 * ```
 */
export const NullableNegativeNumberVO = nullableVO(NegativeNumberSchema, {
	name: "NullableNegativeNumberVO",
});
