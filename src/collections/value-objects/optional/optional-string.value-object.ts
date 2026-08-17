import { optionalVO } from "../custom";
import { StringSchema } from "../../schemas";

/**
 * {@link StringVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link StringSchema} — same validation
 * (unconstrained beyond the type, `""` included), with `undefined` added to
 * the accepted values. Its demo-mode default is `undefined`, not `StringVO`'s
 * own `"string"`.
 *
 * @see `StringVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalStringVO(undefined, { name: "subtitle", source: "post" });
 * new OptionalStringVO("A subtitle", { name: "subtitle", source: "post" });
 * ```
 */
export const OptionalStringVO = optionalVO(StringSchema, {
	name: "OptionalStringVO",
});
