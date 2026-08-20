import type { t } from "@roastery/terroir";
import type { ICustomValueObjectArgs } from "./custom-value-object-args.interface";

/**
 * Payload of `customDoubleVO` — {@link ICustomValueObjectArgs} over
 * `t.NumberOptions`, plus the one thing that makes a decimal VO a decimal VO:
 * how many places to round to.
 *
 * It gets its own interface rather than riding in `options` because `decimals`
 * is **not** a TypeBox option — JSON Schema has no way to express fixed
 * decimal precision, and the constraint is enforced by the generated class's
 * `transform`, never by the schema. Putting it in `options` would hand TypeBox
 * a key it does not understand.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed.
 *
 * @see {@link ICustomValueObjectArgs} — the shared payload this extends.
 *
 * @example
 * ```ts
 * customDoubleVO({ decimals: 6, options: { minimum: -90, maximum: 90 } });
 * ```
 */
export interface IDoubleValueObjectArgs<Sensitive extends boolean = false>
	extends ICustomValueObjectArgs<number, t.NumberOptions, Sensitive> {
	/**
	 * How many decimal places the generated `transform` rounds to. Defaults to
	 * `2`, matching the catalog's `Double*VO` classes.
	 */
	readonly decimals?: number;
}
