import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { BooleanDTO } from "../dtos";
import { BooleanSchema } from "../schemas";

/**
 * Value-object wrapper around a `boolean`. Validates against {@link BooleanSchema}.
 *
 * Beyond the standard `make(value, info)` factory, exposes three sugar
 * constructors so consumers can express intent at the call site:
 * `truthy(info)`, `falsy(info)`, and `from(value, info)` (which coerces any
 * truthy/falsy input via `!!value`).
 *
 * @see {@link BooleanDTO}
 * @see {@link BooleanSchema}
 *
 * @example
 * ```ts
 * import { BooleanVO } from "@roastery/beans/collections";
 *
 * const info = { name: "isPublished", source: "Post" };
 * BooleanVO.make(true, info);
 * BooleanVO.truthy(info);              // BooleanVO wrapping `true`
 * BooleanVO.from("yes", info);         // BooleanVO wrapping `true` (any truthy → true)
 * ```
 */
export class BooleanVO extends ValueObject<boolean, typeof BooleanDTO> {
	protected override readonly schema: Schema<typeof BooleanDTO> = BooleanSchema;

	protected constructor(value: boolean, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `BooleanVO` and runs validation before returning.
	 *
	 * @param value - Boolean to wrap.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is not a boolean.
	 */
	public static make(value: boolean, info: IValueObjectMetadata): BooleanVO {
		const newVO = new BooleanVO(value, info);

		newVO.validate();

		return newVO;
	}

	/**
	 * Sugar for `BooleanVO.make(true, info)`.
	 *
	 * @param info - Metadata for error context.
	 */
	public static truthy(info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(true, info);
	}

	/**
	 * Sugar for `BooleanVO.make(false, info)`.
	 *
	 * @param info - Metadata for error context.
	 */
	public static falsy(info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(false, info);
	}

	/**
	 * Coerces any input to boolean (`!!value`) and wraps it in a `BooleanVO`.
	 *
	 * Useful at integration boundaries where the source emits truthy/falsy
	 * values instead of canonical booleans (form fields, query strings).
	 *
	 * @param value - Anything; `0`, `""`, `null`, `undefined`, `NaN` map to
	 *   `false`; everything else maps to `true`.
	 * @param info - Metadata for error context.
	 */
	public static from(value: unknown, info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(!!value, info);
	}
}
