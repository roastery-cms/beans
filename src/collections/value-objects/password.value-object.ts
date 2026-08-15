import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import { PasswordSchema } from "../schemas";

/**
 * Password value-object. Validates against {@link PasswordSchema}: at least 7
 * characters, mixing upper/lowercase letters, digits and special characters.
 *
 * Wraps the **plain** password for validation purposes — hashing is the
 * caller's concern, downstream of the domain.
 *
 * @see {@link PasswordSchema}
 *
 * @example
 * ```ts
 * new PasswordVO("My$ecureP@ss7", { name: "password", source: "user" });
 * ```
 */
export class PasswordVO extends ValueObject<string, typeof PasswordSchema> {
	/** @returns The password schema and the schema's example as demo default. */
	protected defineMeta(): IValueObjectMetadata<string, typeof PasswordSchema> {
		return { default: "StrongPass1!", schema: PasswordSchema };
	}
}
