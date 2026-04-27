import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { UrlDTO } from "../dtos";
import { UrlSchema } from "../schemas";

/**
 * Value-object wrapper around an HTTP/HTTPS URL string. Validates against
 * {@link UrlSchema}. For non-browser URIs, see `SimpleUrlSchema` and pair it
 * with a custom value-object — there is no built-in `SimpleUrlVO`.
 *
 * @see {@link UrlDTO}
 * @see {@link UrlSchema}
 *
 * @example
 * ```ts
 * import { UrlVO } from "@roastery/beans/collections";
 *
 * const info = { name: "coverImage", source: "Post" };
 * UrlVO.make("https://example.com/cover.jpg", info);
 * ```
 */
export class UrlVO extends ValueObject<string, typeof UrlDTO> {
	protected override readonly schema: Schema<typeof UrlDTO> = UrlSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	/**
	 * Builds a `UrlVO` and runs validation before returning.
	 *
	 * @param value - HTTP/HTTPS URL string.
	 * @param info - Metadata for error context.
	 * @throws `InvalidPropertyException` — when `value` is not a valid HTTP/HTTPS URL.
	 */
	public static make(value: string, info: IValueObjectMetadata): UrlVO {
		const newVO = new UrlVO(value, info);

		newVO.validate();

		return newVO;
	}
}
