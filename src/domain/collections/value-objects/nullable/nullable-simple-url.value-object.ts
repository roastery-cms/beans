import { nullableVO } from "../custom";
import { SimpleUrlSchema } from "../../schemas";

/**
 * {@link SimpleUrlVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link SimpleUrlSchema} — same
 * validation, with `null` added to the accepted values. Its demo-mode default
 * is `null`, not `SimpleUrlVO`'s own example. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * @see `SimpleUrlVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new NullableSimpleUrlVO(null, { name: "cacheUrl", source: "config" });
 * new NullableSimpleUrlVO("redis://localhost:6739", { name: "cacheUrl", source: "config" });
 * ```
 */
export const NullableSimpleUrlVO = nullableVO(SimpleUrlSchema, {
	name: "NullableSimpleUrlVO",
});
