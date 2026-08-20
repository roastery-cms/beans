import { optionalVO } from "../custom";
import { NegativeNumberSchema } from "../../schemas";

/**
 * {@link NegativeNumberVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link NegativeNumberSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `NegativeNumberVO`'s own `-42`.

 * @see `NegativeNumberVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalNegativeNumberVO(undefined, { name: "balance", source: "account" }).value; // undefined
 * new OptionalNegativeNumberVO(-7, { name: "balance", source: "account" }).value;
 * ```
 */
export const OptionalNegativeNumberVO = optionalVO(NegativeNumberSchema, {
	name: "OptionalNegativeNumberVO",
});
