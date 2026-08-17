import { optionalVO } from "../custom";
import { DateTimeSchema } from "../../schemas";

/**
 * {@link DateTimeVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link DateTimeSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `DateTimeVO`'s own current-instant thunk.
 *
 * @see `DateTimeVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalDateTimeVO(undefined, { name: "publishedAt", source: "post" });
 * new OptionalDateTimeVO("2026-08-07T10:00:00.000Z", { name: "publishedAt", source: "post" });
 * ```
 */
export const OptionalDateTimeVO = optionalVO(DateTimeSchema, {
	name: "OptionalDateTimeVO",
});
