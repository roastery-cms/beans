import { optionalVO } from "../custom";
import { PositiveNumberSchema } from "../../schemas";

/**
 * {@link PositiveNumberVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link PositiveNumberSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `PositiveNumberVO`'s own `42`.

 * @see `PositiveNumberVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalPositiveNumberVO(undefined, { name: "views", source: "post" }).value; // undefined
 * new OptionalPositiveNumberVO(7, { name: "views", source: "post" }).value;
 * ```
 */
export const OptionalPositiveNumberVO = optionalVO(PositiveNumberSchema, {
	name: "OptionalPositiveNumberVO",
});
