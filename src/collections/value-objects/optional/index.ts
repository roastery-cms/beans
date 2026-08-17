/**
 * @module @roastery/beans/collections/value-objects/optional
 *
 * The `undefined`-accepting variation of every value-object in
 * `@roastery/beans/collections/value-objects` — same schema, same validation,
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
 * (`@roastery/beans/entity/types`) checks for — so the key may be omitted
 * entirely rather than passed explicitly as `undefined`.
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

export { OptionalBooleanVO } from "./optional-boolean.value-object";
export { OptionalDateTimeVO } from "./optional-date-time.value-object";
export { OptionalEmailVO } from "./optional-email.value-object";
export { OptionalNumberVO } from "./optional-number.value-object";
export { OptionalPasswordVO } from "./optional-password.value-object";
export { OptionalSimpleUrlVO } from "./optional-simple-url.value-object";
export { OptionalSlugVO } from "./optional-slug.value-object";
export { OptionalStringVO } from "./optional-string.value-object";
export { OptionalStringArrayVO } from "./optional-string-array.value-object";
export { OptionalUrlVO } from "./optional-url.value-object";
export { OptionalUuidArrayVO } from "./optional-uuid-array.value-object";
export { OptionalUuidVO } from "./optional-uuid.value-object";
