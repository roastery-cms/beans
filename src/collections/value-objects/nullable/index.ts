/**
 * @module @roastery/beans/collections/value-objects/nullable
 *
 * The `null`-accepting variation of every value-object in
 * `@roastery/beans/collections/value-objects` — same schema, same validation,
 * built by wrapping each one's schema with {@link nullableVO}. Its demo-mode
 * default is `null` throughout, not the required counterpart's own default
 * (`StringVO` demos to `"string"`; `NullableStringVO` demos to `null`).
 *
 * Unlike `@roastery/beans/collections/value-objects/optional`, a blueprint key
 * backed by one of these stays **required** in the constructor payload: `null`
 * is a deliberate value (an explicitly cleared field, mirroring a `NULL`
 * database column), not an omission — `UndefinedableKeys`
 * (`@roastery/beans/entity/types`) only ever relaxes a key for `undefined`.
 * `new Post({ deletedAt: null })` compiles; `new Post({})` does not.
 *
 * Sugar statics on the required counterparts (`BooleanVO.truthy/falsy/from`,
 * `DateTimeVO.now`, `UuidVO.generate`) are **not** mirrored here — reach for
 * the required VO's static and pass its result's `.value` through if one is
 * needed on a nullable property.
 *
 * Re-exports:
 * - {@link NullableBooleanVO}     — boolean or `null`.
 * - {@link NullableDateTimeVO}    — ISO 8601 date-time string or `null`.
 * - {@link NullableEmailVO}       — email address or `null`.
 * - {@link NullableNumberVO}      — non-negative number or `null`.
 * - {@link NullablePasswordVO}    — password with complexity rules, or `null`.
 * - {@link NullableSimpleUrlVO}   — any-protocol URI or `null`.
 * - {@link NullableSlugVO}        — URL-safe slug or `null` (still slugifies a real value).
 * - {@link NullableStringVO}      — string of any length or `null`.
 * - {@link NullableStringArrayVO} — array of strings or `null`.
 * - {@link NullableUrlVO}         — HTTP/HTTPS URL or `null`.
 * - {@link NullableUuidVO}        — UUID string or `null`.
 * - {@link NullableUuidArrayVO}   — array of UUID strings or `null`.
 */

export { NullableBooleanVO } from "./nullable-boolean.value-object";
export { NullableDateTimeVO } from "./nullable-date-time.value-object";
export { NullableEmailVO } from "./nullable-email.value-object";
export { NullableNumberVO } from "./nullable-number.value-object";
export { NullablePasswordVO } from "./nullable-password.value-object";
export { NullableSimpleUrlVO } from "./nullable-simple-url.value-object";
export { NullableSlugVO } from "./nullable-slug.value-object";
export { NullableStringVO } from "./nullable-string.value-object";
export { NullableStringArrayVO } from "./nullable-string-array.value-object";
export { NullableUrlVO } from "./nullable-url.value-object";
export { NullableUuidArrayVO } from "./nullable-uuid-array.value-object";
export { NullableUuidVO } from "./nullable-uuid.value-object";
