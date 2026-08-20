/**
 * @module @roastery/beans/domain/collections/value-objects/optional
 *
 * The `undefined`-accepting variation of every value-object in
 * `@roastery/beans/domain/collections/value-objects` — same schema, same validation,
 * built by wrapping each one's schema with {@link optionalVO}. Its demo-mode
 * default is `undefined` throughout, not the required counterpart's own
 * default (`StringVO` demos to `"string"`; `OptionalStringVO` demos to
 * `undefined`).
 *
 * Sugar statics on the required counterparts (`BooleanVO.truthy/falsy/from`,
 * `DateTimeVO.now`, `UuidVO.generate`) are **not** mirrored here — reach for
 * the required VO's static and pass its result's `.value` through if one is
 * needed on an optional property.
 *
 * A blueprint key backed by one of these becomes optional in the constructor
 * payload — `undefined extends value` is exactly what `UndefinedableKeys`
 * (`@roastery/beans/domain/entity/types`) checks for — so the key may be omitted
 * entirely rather than passed explicitly as `undefined`.
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

export { OptionalBooleanVO } from "./optional-boolean.value-object";
export { OptionalDateTimeVO } from "./optional-date-time.value-object";
export { OptionalDoubleVO } from "./optional-double.value-object";
export { OptionalEmailVO } from "./optional-email.value-object";
export { OptionalIntegerVO } from "./optional-integer.value-object";
export { OptionalNegativeDoubleVO } from "./optional-negative-double.value-object";
export { OptionalNegativeIntegerVO } from "./optional-negative-integer.value-object";
export { OptionalNegativeNumberVO } from "./optional-negative-number.value-object";
export { OptionalNumberVO } from "./optional-number.value-object";
export { OptionalPasswordVO } from "./optional-password.value-object";
export { OptionalPositiveDoubleVO } from "./optional-positive-double.value-object";
export { OptionalPositiveIntegerVO } from "./optional-positive-integer.value-object";
export { OptionalPositiveNumberVO } from "./optional-positive-number.value-object";
export { OptionalSimpleUrlVO } from "./optional-simple-url.value-object";
export { OptionalSlugVO } from "./optional-slug.value-object";
export { OptionalStringVO } from "./optional-string.value-object";
export { OptionalStringArrayVO } from "./optional-string-array.value-object";
export { OptionalUrlVO } from "./optional-url.value-object";
export { OptionalUuidArrayVO } from "./optional-uuid-array.value-object";
export { OptionalUuidVO } from "./optional-uuid.value-object";
