import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { NegativeNumberSchema } from "../schemas";

/**
 * Value-object for non-positive numbers (`<= 0`, zero included). Validates against {@link NegativeNumberSchema}.
 *
 * @see {@link NegativeNumberSchema}
 *
 * @example
 * ```ts
 * new NegativeNumberVO(-7, { name: "balance", source: "account" }).value;
 * NegativeNumberVO.demo({ name: "balance", source: "account" }).value; // -42
 * ```
 */
export class NegativeNumberVO extends ValueObject<
	number,
	typeof NegativeNumberSchema
> {
	/** @returns The negative number schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		number,
		typeof NegativeNumberSchema
	> {
		return { default: -42, schema: NegativeNumberSchema };
	}
}
