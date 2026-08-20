import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { PasswordSchema } from "../schemas";

/**
 * Password value-object. Validates against {@link PasswordSchema}: at least 7
 * characters, mixing upper/lowercase letters, digits and special characters.
 *
 * Wraps the **plain** password for validation purposes — hashing is the
 * caller's concern, downstream of the domain.
 *
 * Declared `sensitive: true`, so the value never reaches a log: a `Command`
 * carrying one replaces it in `toJSON()`, and an `Entity` carrying one replaces
 * it in `toString()`, `toSafeJSON()` and Node's inspect output. `Entity`'s
 * `toJSON()` still emits the real value — it is the persistence contract.
 *
 * The `true` in the third type parameter is what carries that declaration into
 * the type system, and it is load-bearing rather than decorative: it is what
 * makes a `RepositoryOf` over any blueprint holding this class **omit
 * `findByPassword` and `findManyByPassword`**. A port must not offer a lookup
 * by the very value it exists to keep secret.
 *
 * @see {@link PasswordSchema}
 *
 * @example
 * ```ts
 * new PasswordVO("My$ecureP@ss7", { name: "password", source: "user" });
 * ```
 */
export class PasswordVO extends ValueObject<
	string,
	typeof PasswordSchema,
	true
> {
	/** @returns The password schema, the schema's example as demo default, and the sensitivity flag. */
	protected defineMeta(): IValueObjectMetadata<
		string,
		typeof PasswordSchema,
		true
	> {
		return {
			default: "StrongPass1!",
			schema: PasswordSchema,
			sensitive: true,
		};
	}
}
