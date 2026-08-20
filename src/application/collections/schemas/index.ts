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
 * - {@link BooleanSchema}         — boolean.
 * - {@link DateTimeSchema}        — ISO 8601 date-time string.
 * - {@link DoubleSchema}          — fixed-precision decimal of either sign (rounds to 2 places via `transform`).
 * - {@link EmailSchema}           — email address.
 * - {@link IntegerSchema}         — whole number of either sign (truncates via `transform`).
 * - {@link NegativeDoubleSchema}  — fixed-precision decimal `<= 0`.
 * - {@link NegativeIntegerSchema} — whole number `<= 0`.
 * - {@link NegativeNumberSchema}  — number `<= 0`.
 * - {@link NumberSchema}          — number of any sign.
 * - {@link PasswordSchema}        — string with complexity rules.
 * - {@link PositiveDoubleSchema}  — fixed-precision decimal `>= 0`.
 * - {@link PositiveIntegerSchema} — whole number `>= 0`.
 * - {@link PositiveNumberSchema}  — number `>= 0`.
 * - {@link SimpleUrlSchema}       — any-protocol URI.
 * - {@link SlugSchema}            — URL-safe slug.
 * - {@link StringSchema}          — string of any length.
 * - {@link StringArraySchema}     — array of strings.
 * - {@link UrlSchema}             — HTTP/HTTPS URL.
 * - {@link UuidSchema}            — UUID string.
 * - {@link UuidArraySchema}       — array of UUID strings.
 */

export {
	BooleanSchema,
	DateTimeSchema,
	DoubleSchema,
	EmailSchema,
	IntegerSchema,
	NegativeDoubleSchema,
	NegativeIntegerSchema,
	NegativeNumberSchema,
	NumberSchema,
	PasswordSchema,
	PositiveDoubleSchema,
	PositiveIntegerSchema,
	PositiveNumberSchema,
	SimpleUrlSchema,
	SlugSchema,
	StringArraySchema,
	StringSchema,
	UrlSchema,
	UuidArraySchema,
	UuidSchema,
} from "@/domain/collections/schemas";
