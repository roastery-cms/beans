import { optionalVO } from "../custom";
import { SimpleUrlSchema } from "../../schemas";

/**
 * {@link SimpleUrlVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link SimpleUrlSchema} — same
 * validation, with `undefined` added to the accepted values. Its demo-mode
 * default is `undefined`, not `SimpleUrlVO`'s own example.
 *
 * @see `SimpleUrlVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalSimpleUrlVO(undefined, { name: "cacheUrl", source: "config" });
 * new OptionalSimpleUrlVO("redis://localhost:6739", { name: "cacheUrl", source: "config" });
 * ```
 */
export const OptionalSimpleUrlVO = optionalVO(SimpleUrlSchema, {
	name: "OptionalSimpleUrlVO",
});
