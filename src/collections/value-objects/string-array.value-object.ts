import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { StringArrayDTO } from "../dtos";
import { StringArraySchema } from "../schemas";

/**
 * Value-object wrapper around an array of strings. Validates against
 * {@link StringArraySchema} — empty arrays are accepted.
 *
 * @see {@link StringArrayDTO}
 * @see {@link StringArraySchema}
 *
 * @example
 * ```ts
 * import { StringArrayVO } from "@roastery/beans/collections";
 *
 * const info = { name: "tags", source: "Post" };
 * StringArrayVO.make(["tech", "ddd"], info);
 * ```
 */
export class StringArrayVO extends ValueObject<
	string[],
	typeof StringArrayDTO
> {
	protected override readonly schema: Schema<typeof StringArrayDTO> =
		StringArraySchema;

	protected constructor(value: string[], info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `StringArrayVO` and runs validation before returning.
	 *
	 * @param value - Array of strings to wrap.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is not an array of strings.
	 */
	public static make(
		value: string[],
		info: IValueObjectMetadata,
	): StringArrayVO {
		const newVO = new StringArrayVO(value, info);

		newVO.validate();

		return newVO;
	}
}
