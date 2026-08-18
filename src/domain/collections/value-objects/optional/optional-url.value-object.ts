import { optionalVO } from "../custom";
import { UrlSchema } from "../../schemas";

/**
 * {@link UrlVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link UrlSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `UrlVO`'s own example.
 *
 * @see `UrlVO` in `@roastery/beans/domain/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new OptionalUrlVO(undefined, { name: "cover", source: "post" });
 * new OptionalUrlVO("https://example.com/cover.jpg", { name: "cover", source: "post" });
 * ```
 */
export const OptionalUrlVO = optionalVO(UrlSchema, {
	name: "OptionalUrlVO",
});
