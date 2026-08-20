import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { PositiveIntegerSchema } from "../schemas";
import { toInteger } from "./helpers/to-integer";

/**
 * Value-object for non-negative whole numbers (`>= 0`, zero included). Validates against {@link PositiveIntegerSchema}.
 *
 * Like `SlugVO`, it **transforms** the input before validation: a float is
 * truncated toward zero, so `new PositiveIntegerVO(2.7, ctx).value` is `2` and
 * `-2.7` becomes `-2`. That is what lets a computed value reach an integer
 * property without the caller rounding at every call site. If you would
 * rather *reject* a float than normalise it, validate the raw number against
 * {@link PositiveIntegerSchema} before constructing.
 *
 * The demo default is already whole — `transform` does not run over defaults.
 *
 * @see {@link PositiveIntegerSchema}
 *
 * @example
 * ```ts
 * new PositiveIntegerVO(7, { name: "quantity", source: "order" }).value;   // 7
 * new PositiveIntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * PositiveIntegerVO.demo({ name: "quantity", source: "order" }).value; // 42
 * ```
 */
export class PositiveIntegerVO extends ValueObject<
	number,
	typeof PositiveIntegerSchema
> {
	/** @returns The positive integer schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		number,
		typeof PositiveIntegerSchema
	> {
		return { default: 42, schema: PositiveIntegerSchema };
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
