import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import { generateUUID } from "@/entity/helpers";
import type { UuidDTO } from "../dtos";
import { UuidSchema } from "../schemas";

/**
 * Value-object wrapper around a UUID string. Validates against {@link UuidSchema}.
 *
 * Beyond the standard `make(value, info)` factory, exposes a `generate(info)`
 * helper that produces a fresh UUID v7 — the convention every entity follows
 * for its `id` field.
 *
 * @see {@link UuidDTO}
 * @see {@link UuidSchema}
 * @see {@link generateUUID}
 *
 * @example
 * ```ts
 * import { UuidVO } from "@roastery/beans/collections";
 *
 * const info = { name: "id", source: "Post" };
 * UuidVO.make("550e8400-e29b-41d4-a716-446655440000", info);
 * UuidVO.generate(info); // fresh UUID v7
 * ```
 */
export class UuidVO extends ValueObject<string, typeof UuidDTO> {
	protected override readonly schema: Schema<typeof UuidDTO> = UuidSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `UuidVO` and runs validation before returning.
	 *
	 * @param value - UUID string (any version).
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is not a valid UUID.
	 */
	public static make(value: string, info: IValueObjectMetadata): UuidVO {
		const newVO = new UuidVO(value, info);

		newVO.validate();

		return newVO;
	}

	/**
	 * Generates a fresh UUID v7 (time-sortable) and wraps it.
	 *
	 * @param info - Metadata for error context.
	 */
	public static generate(info: IValueObjectMetadata): UuidVO {
		return UuidVO.make(generateUUID(), info);
	}
}
