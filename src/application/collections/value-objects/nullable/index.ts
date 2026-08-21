/**
 * @module @roastery/beans/application/collections/value-objects/nullable
 *
 * Application-layer alias onto
 * `@roastery/beans/domain/collections/value-objects/nullable` — the exact
 * same `null`-accepting value-objects, re-exported here so a `Command`
 * blueprint never has to reach across into `@roastery/beans/domain` just to
 * reuse one. Kept in sync by hand with the domain barrel it mirrors; every
 * name below is a straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link NullableBooleanVO}         — boolean or `null`.
 * - {@link NullableDateTimeVO}        — ISO 8601 date-time string or `null`.
 * - {@link NullableDoubleVO}          — fixed-precision decimal of either sign (rounds to 2 places via `transform`).
 * - {@link NullableEmailVO}           — email address or `null`.
 * - {@link NullableIntegerVO}         — whole number of either sign (truncates via `transform`).
 * - {@link NullableNegativeDoubleVO}  — fixed-precision decimal `<= 0`.
 * - {@link NullableNegativeIntegerVO} — whole number `<= 0`.
 * - {@link NullableNegativeNumberVO}  — number `<= 0`.
 * - {@link NullableNumberVO}          — non-negative number or `null`.
 * - {@link NullablePasswordVO}        — password with complexity rules, or `null`.
 * - {@link NullablePositiveDoubleVO}  — fixed-precision decimal `>= 0`.
 * - {@link NullablePositiveIntegerVO} — whole number `>= 0`.
 * - {@link NullablePositiveNumberVO}  — number `>= 0`.
 * - {@link NullableSchemaVO}          — JSON-serialized TypeBox schema or `null` (still checked to compile).
 * - {@link NullableSimpleUrlVO}       — any-protocol URI or `null`.
 * - {@link NullableSlugVO}            — URL-safe slug or `null` (still slugifies a real value).
 * - {@link NullableStringVO}          — string of any length or `null`.
 * - {@link NullableStringArrayVO}     — array of strings or `null`.
 * - {@link NullableUrlVO}             — HTTP/HTTPS URL or `null`.
 * - {@link NullableUuidVO}            — UUID string or `null`.
 * - {@link NullableUuidArrayVO}       — array of UUID strings or `null`.
 */

export {
	NullableBooleanVO,
	NullableDateTimeVO,
	NullableDoubleVO,
	NullableEmailVO,
	NullableIntegerVO,
	NullableNegativeDoubleVO,
	NullableNegativeIntegerVO,
	NullableNegativeNumberVO,
	NullableNumberVO,
	NullablePasswordVO,
	NullablePositiveDoubleVO,
	NullablePositiveIntegerVO,
	NullablePositiveNumberVO,
	NullableSchemaVO,
	NullableSimpleUrlVO,
	NullableSlugVO,
	NullableStringArrayVO,
	NullableStringVO,
	NullableUrlVO,
	NullableUuidArrayVO,
	NullableUuidVO,
} from "@/domain/collections/value-objects/nullable";
