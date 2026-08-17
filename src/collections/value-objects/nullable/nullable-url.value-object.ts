import { nullableVO } from "../custom";
import { UrlSchema } from "../../schemas";

/**
 * {@link UrlVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link UrlSchema} — same validation, with
 * `null` added to the accepted values. Its demo-mode default is `null`, not
 * `UrlVO`'s own example. Unlike an `Optional*VO`, the blueprint key stays
 * **required** — `null` must be passed explicitly.
 *
 * @see `UrlVO` in `@roastery/beans/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new NullableUrlVO(null, { name: "cover", source: "post" });
 * new NullableUrlVO("https://example.com/cover.jpg", { name: "cover", source: "post" });
 * ```
 */
export const NullableUrlVO = nullableVO(UrlSchema, {
	name: "NullableUrlVO",
});
