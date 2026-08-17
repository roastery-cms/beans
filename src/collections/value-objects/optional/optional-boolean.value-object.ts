import { optionalVO } from "../custom";
import { BooleanSchema } from "../../schemas";

/**
 * {@link BooleanVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link BooleanSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `BooleanVO`'s own `true`.
 *
 * @see `BooleanVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalBooleanVO(undefined, { name: "featured", source: "post" });
 * new OptionalBooleanVO(true, { name: "featured", source: "post" });
 * ```
 */
export const OptionalBooleanVO = optionalVO(BooleanSchema, {
	name: "OptionalBooleanVO",
});
