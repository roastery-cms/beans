import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import { NumberSchema } from "../schemas";

/**
 * Non-negative number value-object. Validates against {@link NumberSchema}
 * (`minimum: 0`).
 *
 * @see {@link NumberSchema}
 *
 * @example
 * ```ts
 * new NumberVO(7, { name: "views", source: "post" });
 * NumberVO.demo({ name: "views", source: "post" }).value; // 42
 * ```
 */
export class NumberVO extends ValueObject<number, typeof NumberSchema> {
	/** @returns The non-negative number schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<number, typeof NumberSchema> {
		return { default: 42, schema: NumberSchema };
	}
}
