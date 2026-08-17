import { nullableVO } from "../custom";
import { UuidArraySchema } from "../../schemas";

/**
 * {@link UuidArrayVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link UuidArraySchema} — same
 * validation, with `null` added to the accepted values (on top of the empty
 * array, already valid on its own). Its demo-mode default is `null`, not
 * `UuidArrayVO`'s own `[]`. Unlike an `Optional*VO`, the blueprint key stays
 * **required** — `null` must be passed explicitly.
 *
 * @see `UuidArrayVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableUuidArrayVO(null, { name: "authorIds", source: "post" });
 * new NullableUuidArrayVO([id1, id2], { name: "authorIds", source: "post" });
 * ```
 */
export const NullableUuidArrayVO = nullableVO(UuidArraySchema, {
	name: "NullableUuidArrayVO",
});
