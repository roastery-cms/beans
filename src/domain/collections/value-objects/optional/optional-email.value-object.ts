import { optionalVO } from "../custom";
import { EmailSchema } from "../../schemas";

/**
 * {@link EmailVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link EmailSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `EmailVO`'s own example address.
 *
 * @see `EmailVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalEmailVO(undefined, { name: "email", source: "user" });
 * new OptionalEmailVO("alan@example.com", { name: "email", source: "user" });
 * ```
 */
export const OptionalEmailVO = optionalVO(EmailSchema, {
	name: "OptionalEmailVO",
});
