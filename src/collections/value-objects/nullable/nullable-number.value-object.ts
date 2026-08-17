import { nullableVO } from "../custom";
import { NumberSchema } from "../../schemas";

/**
 * {@link NumberVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link NumberSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `NumberVO`'s own `42`. Unlike an `Optional*VO`, the blueprint key stays
 * **required** — `null` must be passed explicitly.
 *
 * @see `NumberVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableNumberVO(null, { name: "views", source: "post" });
 * new NullableNumberVO(7, { name: "views", source: "post" });
 * ```
 */
export const NullableNumberVO = nullableVO(NumberSchema, {
	name: "NullableNumberVO",
});
