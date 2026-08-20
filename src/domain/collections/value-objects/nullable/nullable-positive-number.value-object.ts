import { nullableVO } from "../custom";
import { PositiveNumberSchema } from "../../schemas";

/**
 * {@link PositiveNumberVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link PositiveNumberSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `PositiveNumberVO`'s own `42`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.

 * @see `PositiveNumberVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullablePositiveNumberVO(null, { name: "views", source: "post" }).value; // null
 * new NullablePositiveNumberVO(7, { name: "views", source: "post" }).value;
 * ```
 */
export const NullablePositiveNumberVO = nullableVO(PositiveNumberSchema, {
	name: "NullablePositiveNumberVO",
});
