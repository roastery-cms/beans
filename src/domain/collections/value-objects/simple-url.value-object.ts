import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { SimpleUrlSchema } from "../schemas";

/**
 * URI value-object accepting **any** protocol (HTTP, Redis, Mongo, etc.).
 * Validates against {@link SimpleUrlSchema}. Use {@link UrlVO} when only
 * HTTP/HTTPS should pass.
 *
 * @see {@link SimpleUrlSchema}
 * @see {@link UrlVO} — the HTTP/HTTPS-only counterpart.
 *
 * @example
 * ```ts
 * new SimpleUrlVO("redis://localhost:6739", { name: "cacheUrl", source: "config" });
 * ```
 */
export class SimpleUrlVO extends ValueObject<string, typeof SimpleUrlSchema> {
	/** @returns The any-protocol URI schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<string, typeof SimpleUrlSchema> {
		return { default: "redis://localhost:6739", schema: SimpleUrlSchema };
	}
}
