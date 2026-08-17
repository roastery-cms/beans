import { nullableVO } from "../custom";
import { EmailSchema } from "../../schemas";

/**
 * {@link EmailVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link EmailSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `EmailVO`'s own example address. Unlike an `Optional*VO`, the blueprint
 * key stays **required** — `null` must be passed explicitly.
 *
 * @see `EmailVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableEmailVO(null, { name: "email", source: "user" });
 * new NullableEmailVO("alan@example.com", { name: "email", source: "user" });
 * ```
 */
export const NullableEmailVO = nullableVO(EmailSchema, {
	name: "NullableEmailVO",
});
