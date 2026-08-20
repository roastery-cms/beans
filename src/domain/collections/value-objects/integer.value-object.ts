import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { IntegerSchema } from "../schemas";
import { toInteger } from "./helpers/to-integer";

/**
 * Value-object for whole numbers of either sign. Validates against {@link IntegerSchema}.
 *
 * Like `SlugVO`, it **transforms** the input before validation: a float is
 * truncated toward zero, so `new IntegerVO(2.7, ctx).value` is `2` and
 * `-2.7` becomes `-2`. That is what lets a computed value reach an integer
 * property without the caller rounding at every call site. If you would
 * rather *reject* a float than normalise it, validate the raw number against
 * {@link IntegerSchema} before constructing.
 *
 * The demo default is already whole — `transform` does not run over defaults.
 *
 * @see {@link IntegerSchema}
 *
 * @example
 * ```ts
 * new IntegerVO(7, { name: "quantity", source: "order" }).value;   // 7
 * new IntegerVO(2.7, { name: "quantity", source: "order" }).value; // 2
 * IntegerVO.demo({ name: "quantity", source: "order" }).value; // 42
 * ```
 */
export class IntegerVO extends ValueObject<number, typeof IntegerSchema> {
	/** @returns The integer schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<number, typeof IntegerSchema> {
		return { default: 42, schema: IntegerSchema };
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
