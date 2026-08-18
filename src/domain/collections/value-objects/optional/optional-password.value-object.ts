import { optionalVO } from "../custom";
import { PasswordSchema } from "../../schemas";

/**
 * {@link PasswordVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link PasswordSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `PasswordVO`'s own example.
 *
 * @see `PasswordVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalPasswordVO(undefined, { name: "password", source: "user" });
 * new OptionalPasswordVO("My$ecureP@ss7", { name: "password", source: "user" });
 * ```
 */
export const OptionalPasswordVO = optionalVO(PasswordSchema, {
	name: "OptionalPasswordVO",
});
