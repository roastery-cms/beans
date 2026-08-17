import { optionalVO } from "../custom";
import { StringArraySchema } from "../../schemas";

/**
 * {@link StringArrayVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link StringArraySchema} — same
 * validation, with `undefined` added to the accepted values (on top of the
 * empty array, already valid on its own). Its demo-mode default is
 * `undefined`, not `StringArrayVO`'s own `[]`.
 *
 * @see `StringArrayVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalStringArrayVO(undefined, { name: "tags", source: "post" });
 * new OptionalStringArrayVO(["ts", "ddd"], { name: "tags", source: "post" });
 * ```
 */
export const OptionalStringArrayVO = optionalVO(StringArraySchema, {
	name: "OptionalStringArrayVO",
});
