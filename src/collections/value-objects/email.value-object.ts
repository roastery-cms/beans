import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import { EmailSchema } from "../schemas";

/**
 * Email address value-object. Validates against {@link EmailSchema}
 * (`format: "email"`).
 *
 * @see {@link EmailSchema}
 *
 * @example
 * ```ts
 * new EmailVO("alan@example.com", { name: "email", source: "user" });
 * EmailVO.demo({ name: "email", source: "user" }).value; // "user@example.com"
 * ```
 */
export class EmailVO extends ValueObject<string, typeof EmailSchema> {
	/** @returns The email schema and the schema's example address as demo default. */
	protected defineMeta(): IValueObjectMetadata<string, typeof EmailSchema> {
		return { default: "user@example.com", schema: EmailSchema };
	}
}
