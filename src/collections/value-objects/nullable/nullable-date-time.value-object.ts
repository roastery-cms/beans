import { nullableVO } from "../custom";
import { DateTimeSchema } from "../../schemas";

/**
 * {@link DateTimeVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link DateTimeSchema} — same
 * validation, with `null` added to the accepted values. Its demo-mode default
 * is `null`, not `DateTimeVO`'s own current-instant thunk. Unlike an
 * `Optional*VO`, the blueprint key stays **required** — `null` must be passed
 * explicitly, which is exactly the shape a "cleared" timestamp column needs
 * (e.g. `deletedAt`, `publishedAt`).
 *
 * @see `DateTimeVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableDateTimeVO(null, { name: "deletedAt", source: "post" });
 * new NullableDateTimeVO("2026-08-07T10:00:00.000Z", { name: "deletedAt", source: "post" });
 * ```
 */
export const NullableDateTimeVO = nullableVO(DateTimeSchema, {
	name: "NullableDateTimeVO",
});
