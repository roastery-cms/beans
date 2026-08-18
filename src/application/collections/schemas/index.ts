/**
 * @module @roastery/beans/application/collections/schemas
 *
 * Application-layer alias onto `@roastery/beans/domain/collections/schemas` —
 * the exact same schemas, re-exported here so a `Command` blueprint never has
 * to reach across into `@roastery/beans/domain` just to reuse one. Kept in
 * sync by hand with the domain barrel it mirrors; every name below is a
 * straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link BooleanSchema}     — boolean.
 * - {@link DateTimeSchema}    — ISO 8601 date-time string.
 * - {@link EmailSchema}       — email address.
 * - {@link NumberSchema}      — non-negative number.
 * - {@link PasswordSchema}    — string with complexity rules.
 * - {@link SimpleUrlSchema}   — any-protocol URI.
 * - {@link SlugSchema}        — URL-safe slug.
 * - {@link StringSchema}      — string of any length.
 * - {@link StringArraySchema} — array of strings.
 * - {@link UrlSchema}         — HTTP/HTTPS URL.
 * - {@link UuidSchema}        — UUID string.
 * - {@link UuidArraySchema}   — array of UUID strings.
 */

export {
	BooleanSchema,
	DateTimeSchema,
	EmailSchema,
	NumberSchema,
	PasswordSchema,
	SimpleUrlSchema,
	SlugSchema,
	StringSchema,
	StringArraySchema,
	UrlSchema,
	UuidSchema,
	UuidArraySchema,
} from "@/domain/collections/schemas";
