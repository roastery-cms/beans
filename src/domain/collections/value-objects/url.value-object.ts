import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { UrlSchema } from "../schemas";

/**
 * HTTP/HTTPS URL value-object. Validates against {@link UrlSchema}. Use
 * {@link SimpleUrlVO} when any protocol should pass.
 *
 * @see {@link UrlSchema}
 * @see {@link SimpleUrlVO} — the any-protocol counterpart.
 *
 * @example
 * ```ts
 * new UrlVO("https://example.com/cover.jpg", { name: "cover", source: "post" });
 * ```
 */
export class UrlVO extends ValueObject<string, typeof UrlSchema> {
	/** @returns The HTTP/HTTPS URL schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<string, typeof UrlSchema> {
		return { default: "https://example.com/cover.jpg", schema: UrlSchema };
	}
}
