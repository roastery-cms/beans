import { optionalVO } from "../custom";
import { NegativeIntegerSchema } from "../../schemas";
import { toInteger } from "../helpers/to-integer";

/**
 * {@link NegativeIntegerVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link NegativeIntegerSchema} — same validation, with
 * `undefined` added to the accepted values. Its demo-mode default is `undefined`, not
 * `NegativeIntegerVO`'s own `-42`.
 *
 * The `transform` hook mirrors `NegativeIntegerVO`'s own: a real number is still
 * truncated toward zero before validation
 * (`optionalVO` only wraps a *schema*, not a VO's `transform` override, so this
 * has to be declared here explicitly). `undefined` passes through untouched.
 *
 * @see `NegativeIntegerVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalNegativeIntegerVO(undefined, { name: "adjustment", source: "ledger" }).value; // undefined
 * new OptionalNegativeIntegerVO(-7, { name: "adjustment", source: "ledger" }).value;
 * new OptionalNegativeIntegerVO(2.7, { name: "adjustment", source: "ledger" }).value; // 2
 * ```
 */
export const OptionalNegativeIntegerVO = optionalVO(NegativeIntegerSchema, {
	name: "OptionalNegativeIntegerVO",
	transform: (value) => (value === undefined ? value : toInteger(value)),
});
