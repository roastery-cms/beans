import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { NegativeDoubleSchema } from "../schemas";
import { toDouble } from "./helpers/to-double";

/**
 * Value-object for non-positive fixed-precision decimals (`<= 0`, zero included). Validates against {@link NegativeDoubleSchema}.
 *
 * Like `SlugVO`, it **transforms** the input before validation: the value is
 * rounded to **two decimal places**, so `new NegativeDoubleVO(1234.5678, ctx).value`
 * is `1234.57`. This is the only sense in which a JavaScript `number` can be
 * "converted to decimal" — `2.0` and `2` are the same value — so what the VO
 * enforces is the precision, not the notation. See {@link toDouble} for the
 * documented limits of decimal rounding over binary floats, and reach for
 * `customDoubleVO({ decimals })` when two places is the wrong precision.
 *
 * The demo default is already at two decimal places — `transform` does not run over defaults.
 *
 * @see {@link NegativeDoubleSchema}
 *
 * @example
 * ```ts
 * new NegativeDoubleVO(-7.5, { name: "discount", source: "invoice" }).value;        // -7.5
 * new NegativeDoubleVO(1234.5678, { name: "discount", source: "invoice" }).value; // 1234.57
 * NegativeDoubleVO.demo({ name: "discount", source: "invoice" }).value; // -42.5
 * ```
 */
export class NegativeDoubleVO extends ValueObject<
	number,
	typeof NegativeDoubleSchema
> {
	/** @returns The negative double schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		number,
		typeof NegativeDoubleSchema
	> {
		return { default: -42.5, schema: NegativeDoubleSchema };
	}

	/**
	 * Rounds the raw input to two decimal places before validation.
	 *
	 * @param value - Any number.
	 * @returns The rounded value, which will be validated and stored.
	 */
	protected override transform(value: number): number {
		return toDouble(value);
	}
}
