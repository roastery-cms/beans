import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { NegativeIntegerSchema } from "../schemas";
import { toInteger } from "./helpers/to-integer";

/**
 * Value-object for non-positive whole numbers (`<= 0`, zero included). Validates against {@link NegativeIntegerSchema}.
 *
 * Like `SlugVO`, it **transforms** the input before validation: a float is
 * truncated toward zero, so `new NegativeIntegerVO(2.7, ctx).value` is `2` and
 * `-2.7` becomes `-2`. That is what lets a computed value reach an integer
 * property without the caller rounding at every call site. If you would
 * rather *reject* a float than normalise it, validate the raw number against
 * {@link NegativeIntegerSchema} before constructing.
 *
 * The demo default is already whole — `transform` does not run over defaults.
 *
 * @see {@link NegativeIntegerSchema}
 *
 * @example
 * ```ts
 * new NegativeIntegerVO(-7, { name: "adjustment", source: "ledger" }).value;   // -7
 * new NegativeIntegerVO(2.7, { name: "adjustment", source: "ledger" }).value; // 2
 * NegativeIntegerVO.demo({ name: "adjustment", source: "ledger" }).value; // -42
 * ```
 */
export class NegativeIntegerVO extends ValueObject<
	number,
	typeof NegativeIntegerSchema
> {
	/** @returns The negative integer schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		number,
		typeof NegativeIntegerSchema
	> {
		return { default: -42, schema: NegativeIntegerSchema };
	}

	/**
	 * Truncates the raw input toward zero before validation.
	 *
	 * @param value - Any number.
	 * @returns Its integer part, which will be validated and stored.
	 */
	protected override transform(value: number): number {
		return toInteger(value);
	}
}
