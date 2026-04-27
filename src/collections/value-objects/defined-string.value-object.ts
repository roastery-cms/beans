import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { StringDTO } from "../dtos";
import { StringSchema } from "../schemas";

/**
 * Value-object wrapper around a non-empty string. **Reuses {@link StringDTO}
 * and {@link StringSchema}** rather than declaring its own — the type is a
 * semantic alias for "string with `minLength: 1`", not a structurally distinct
 * shape.
 *
 * Use this VO whenever a domain field stores a defined string (titles,
 * descriptions, tag names, etc.) — the wrapping makes the contract visible at
 * the type level even though the validator is the same as `StringSchema`.
 *
 * @see {@link StringDTO}
 * @see {@link StringSchema}
 *
 * @example
 * ```ts
 * import { DefinedStringVO } from "@roastery/beans/collections";
 *
 * const info = { name: "title", source: "Post" };
 * DefinedStringVO.make("My Cool Post", info);
 * ```
 */
export class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
	protected override readonly schema: Schema<typeof StringDTO> = StringSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `DefinedStringVO` and runs validation before returning.
	 *
	 * @param value - String to wrap. Must be non-empty.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is the empty string.
	 */
	public static make(
		value: string,
		info: IValueObjectMetadata,
	): DefinedStringVO {
		const newVO = new DefinedStringVO(value, info);

		newVO.validate();

		return newVO;
	}
}
