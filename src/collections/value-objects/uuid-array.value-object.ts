import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { UuidArrayDTO } from "../dtos";
import { UuidArraySchema } from "../schemas";

/**
 * Value-object wrapper around an array of UUID strings. Validates against
 * {@link UuidArraySchema} — empty arrays are accepted.
 *
 * @see {@link UuidArrayDTO}
 * @see {@link UuidArraySchema}
 *
 * @example
 * ```ts
 * import { UuidArrayVO } from "@roastery/beans/collections";
 *
 * const info = { name: "memberIds", source: "Team" };
 * UuidArrayVO.make(["550e8400-e29b-41d4-a716-446655440000"], info);
 * ```
 */
export class UuidArrayVO extends ValueObject<string[], typeof UuidArrayDTO> {
	protected override readonly schema: Schema<typeof UuidArrayDTO> =
		UuidArraySchema;

	protected constructor(value: string[], info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `UuidArrayVO` and runs validation before returning.
	 *
	 * @param value - Array of UUID strings.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when any element is not a valid UUID.
	 */
	public static make(value: string[], info: IValueObjectMetadata): UuidArrayVO {
		const newVO = new UuidArrayVO(value, info);

		newVO.validate();

		return newVO;
	}
}
