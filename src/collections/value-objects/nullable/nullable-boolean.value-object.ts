import { nullableVO } from "../custom";
import { BooleanSchema } from "../../schemas";

/**
 * {@link BooleanVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link BooleanSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `BooleanVO`'s own `true`. Unlike an `Optional*VO`, the blueprint key
 * stays **required** — `null` must be passed explicitly.
 *
 * @see `BooleanVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableBooleanVO(null, { name: "featured", source: "post" });
 * new NullableBooleanVO(true, { name: "featured", source: "post" });
 * ```
 */
export const NullableBooleanVO = nullableVO(BooleanSchema, {
	name: "NullableBooleanVO",
});
