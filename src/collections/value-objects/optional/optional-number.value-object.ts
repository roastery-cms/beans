import { optionalVO } from "../custom";
import { NumberSchema } from "../../schemas";

/**
 * {@link NumberVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link NumberSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `NumberVO`'s own `42`.
 *
 * @see `NumberVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalNumberVO(undefined, { name: "views", source: "post" });
 * new OptionalNumberVO(7, { name: "views", source: "post" });
 * ```
 */
export const OptionalNumberVO = optionalVO(NumberSchema, {
	name: "OptionalNumberVO",
});
