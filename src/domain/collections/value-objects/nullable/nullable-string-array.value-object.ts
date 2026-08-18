import { nullableVO } from "../custom";
import { StringArraySchema } from "../../schemas";

/**
 * {@link StringArrayVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link StringArraySchema} — same
 * validation, with `null` added to the accepted values (on top of the empty
 * array, already valid on its own). Its demo-mode default is `null`, not
 * `StringArrayVO`'s own `[]`. Unlike an `Optional*VO`, the blueprint key
 * stays **required** — `null` must be passed explicitly.
 *
 * @see `StringArrayVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableStringArrayVO(null, { name: "tags", source: "post" });
 * new NullableStringArrayVO(["ts", "ddd"], { name: "tags", source: "post" });
 * ```
 */
export const NullableStringArrayVO = nullableVO(StringArraySchema, {
	name: "NullableStringArrayVO",
});
