import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { StringArraySchema } from "../schemas";

/**
 * Array-of-strings value-object. Validates against {@link StringArraySchema};
 * an empty array is valid.
 *
 * @see {@link StringArraySchema}
 *
 * @example
 * ```ts
 * new StringArrayVO(["ts", "ddd"], { name: "tags", source: "post" });
 * StringArrayVO.demo({ name: "tags", source: "post" }).value; // []
 * ```
 */
export class StringArrayVO extends ValueObject<
	string[],
	typeof StringArraySchema
> {
	/** @returns The string-array schema and an empty array as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		string[],
		typeof StringArraySchema
	> {
		return { default: [], schema: StringArraySchema };
	}
}
