import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { DateTimeDTO } from "../dtos";
import { DateTimeSchema } from "../schemas";

/**
 * Value-object wrapper around an ISO 8601 date-time string. Validates against
 * {@link DateTimeSchema}.
 *
 * Exposes a `now(info)` factory that captures the current timestamp via
 * `new Date().toISOString()` — used by {@link Entity.update} when stamping
 * `updatedAt`.
 *
 * @see {@link DateTimeDTO}
 * @see {@link DateTimeSchema}
 *
 * @example
 * ```ts
 * import { DateTimeVO } from "@roastery/beans/collections";
 *
 * const info = { name: "createdAt", source: "Post" };
 * DateTimeVO.make("2026-04-27T10:00:00.000Z", info);
 * DateTimeVO.now(info); // current ISO timestamp, validated
 * ```
 */
export class DateTimeVO extends ValueObject<string, typeof DateTimeDTO> {
	protected override readonly schema: Schema<typeof DateTimeDTO> =
		DateTimeSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `DateTimeVO` and runs validation before returning.
	 *
	 * @param value - ISO 8601 date-time string.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is not a valid ISO 8601 date-time.
	 */
	public static make(value: string, info: IValueObjectMetadata): DateTimeVO {
		const newVO = new DateTimeVO(value, info);

		newVO.validate();

		return newVO;
	}

	/**
	 * Captures the current wall-clock time as an ISO 8601 string and wraps it.
	 *
	 * @param info - Metadata for error context.
	 */
	public static now(info: IValueObjectMetadata): DateTimeVO {
		return DateTimeVO.make(new Date().toISOString(), info);
	}
}
