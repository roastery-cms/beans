import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { PositiveNumberSchema } from "../schemas";

/**
 * Value-object for non-negative numbers (`>= 0`, zero included). Validates against {@link PositiveNumberSchema}.
 *
 * @see {@link PositiveNumberSchema}
 *
 * @example
 * ```ts
 * new PositiveNumberVO(7, { name: "views", source: "post" }).value;
 * PositiveNumberVO.demo({ name: "views", source: "post" }).value; // 42
 * ```
 */
export class PositiveNumberVO extends ValueObject<
	number,
	typeof PositiveNumberSchema
> {
	/** @returns The positive number schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		number,
		typeof PositiveNumberSchema
	> {
		return { default: 42, schema: PositiveNumberSchema };
	}
}
