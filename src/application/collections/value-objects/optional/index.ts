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
 * - {@link OptionalBooleanVO}     — boolean or `undefined`.
 * - {@link OptionalDateTimeVO}    — ISO 8601 date-time string or `undefined`.
 * - {@link OptionalEmailVO}       — email address or `undefined`.
 * - {@link OptionalNumberVO}      — non-negative number or `undefined`.
 * - {@link OptionalPasswordVO}    — password with complexity rules, or `undefined`.
 * - {@link OptionalSimpleUrlVO}   — any-protocol URI or `undefined`.
 * - {@link OptionalSlugVO}        — URL-safe slug or `undefined` (still slugifies a real value).
 * - {@link OptionalStringVO}      — string of any length or `undefined`.
 * - {@link OptionalStringArrayVO} — array of strings or `undefined`.
 * - {@link OptionalUrlVO}         — HTTP/HTTPS URL or `undefined`.
 * - {@link OptionalUuidVO}        — UUID string or `undefined`.
 * - {@link OptionalUuidArrayVO}   — array of UUID strings or `undefined`.
 */

export {
	OptionalBooleanVO,
	OptionalDateTimeVO,
	OptionalEmailVO,
	OptionalNumberVO,
	OptionalPasswordVO,
	OptionalSimpleUrlVO,
	OptionalSlugVO,
	OptionalStringVO,
	OptionalStringArrayVO,
	OptionalUrlVO,
	OptionalUuidArrayVO,
	OptionalUuidVO,
} from "@/domain/collections/value-objects/optional";
