/**
 * @module @roastery/beans/application/collections/value-objects/optional
 *
 * Application-layer alias onto
 * `@roastery/beans/domain/collections/value-objects/optional` — the exact
 * same `undefined`-accepting value-objects, re-exported here so a `Command`
 * blueprint never has to reach across into `@roastery/beans/domain` just to
 * reuse one. Kept in sync by hand with the domain barrel it mirrors; every
 * name below is a straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link OptionalBooleanVO}         — boolean or `undefined`.
 * - {@link OptionalDateTimeVO}        — ISO 8601 date-time string or `undefined`.
 * - {@link OptionalDoubleVO}          — fixed-precision decimal of either sign (rounds to 2 places via `transform`).
 * - {@link OptionalEmailVO}           — email address or `undefined`.
 * - {@link OptionalIntegerVO}         — whole number of either sign (truncates via `transform`).
 * - {@link OptionalNegativeDoubleVO}  — fixed-precision decimal `<= 0`.
 * - {@link OptionalNegativeIntegerVO} — whole number `<= 0`.
 * - {@link OptionalNegativeNumberVO}  — number `<= 0`.
 * - {@link OptionalNumberVO}          — non-negative number or `undefined`.
 * - {@link OptionalPasswordVO}        — password with complexity rules, or `undefined`.
 * - {@link OptionalPositiveDoubleVO}  — fixed-precision decimal `>= 0`.
 * - {@link OptionalPositiveIntegerVO} — whole number `>= 0`.
 * - {@link OptionalPositiveNumberVO}  — number `>= 0`.
 * - {@link OptionalSimpleUrlVO}       — any-protocol URI or `undefined`.
 * - {@link OptionalSlugVO}            — URL-safe slug or `undefined` (still slugifies a real value).
 * - {@link OptionalStringVO}          — string of any length or `undefined`.
 * - {@link OptionalStringArrayVO}     — array of strings or `undefined`.
 * - {@link OptionalUrlVO}             — HTTP/HTTPS URL or `undefined`.
 * - {@link OptionalUuidVO}            — UUID string or `undefined`.
 * - {@link OptionalUuidArrayVO}       — array of UUID strings or `undefined`.
 */

export {
	OptionalBooleanVO,
	OptionalDateTimeVO,
	OptionalDoubleVO,
	OptionalEmailVO,
	OptionalIntegerVO,
	OptionalNegativeDoubleVO,
	OptionalNegativeIntegerVO,
	OptionalNegativeNumberVO,
	OptionalNumberVO,
	OptionalPasswordVO,
	OptionalPositiveDoubleVO,
	OptionalPositiveIntegerVO,
	OptionalPositiveNumberVO,
	OptionalSimpleUrlVO,
	OptionalSlugVO,
	OptionalStringArrayVO,
	OptionalStringVO,
	OptionalUrlVO,
	OptionalUuidArrayVO,
	OptionalUuidVO,
} from "@/domain/collections/value-objects/optional";
