import { nullableVO } from "../custom";
import { PasswordSchema } from "../../schemas";

/**
 * {@link PasswordVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link PasswordSchema} — same
 * validation, with `null` added to the accepted values. Its demo-mode default
 * is `null`, not `PasswordVO`'s own example. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * @see `PasswordVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullablePasswordVO(null, { name: "password", source: "user" });
 * new NullablePasswordVO("My$ecureP@ss7", { name: "password", source: "user" });
 * ```
 */
export const NullablePasswordVO = nullableVO(PasswordSchema, {
	name: "NullablePasswordVO",
});
