import { nullableVO } from "../custom";
import { StringSchema } from "../../schemas";

/**
 * {@link StringVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link StringSchema} — same validation
 * (unconstrained beyond the type, `""` included), with `null` added to the
 * accepted values. Its demo-mode default is `null`, not `StringVO`'s own
 * `"string"`. Unlike an `Optional*VO`, the blueprint key stays **required** —
 * `null` must be passed explicitly.
 *
 * @see `StringVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableStringVO(null, { name: "subtitle", source: "post" });
 * new NullableStringVO("A subtitle", { name: "subtitle", source: "post" });
 * ```
 */
export const NullableStringVO = nullableVO(StringSchema, {
	name: "NullableStringVO",
});
