/**
 * @module @roastery/beans/domain/collections/value-objects/nullable
 *
 * The `null`-accepting variation of every value-object in
 * `@roastery/beans/domain/collections/value-objects` — same schema, same validation,
 * built by wrapping each one's schema with {@link nullableVO}. Its demo-mode
 * default is `null` throughout, not the required counterpart's own default
 * (`StringVO` demos to `"string"`; `NullableStringVO` demos to `null`).
 *
 * Unlike `@roastery/beans/domain/collections/value-objects/optional`, a blueprint key
 * backed by one of these stays **required** in the constructor payload: `null`
 * is a deliberate value (an explicitly cleared field, mirroring a `NULL`
 * database column), not an omission — `UndefinedableKeys`
 * (`@roastery/beans/domain/entity/types`) only ever relaxes a key for `undefined`.
 * `new Post({ deletedAt: null })` compiles; `new Post({})` does not.
 *
 * Sugar statics on the required counterparts (`BooleanVO.truthy/falsy/from`,
 * `DateTimeVO.now`, `UuidVO.generate`) are **not** mirrored here — reach for
 * the required VO's static and pass its result's `.value` through if one is
 * needed on a nullable property.
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

export { NullableBooleanVO } from "./nullable-boolean.value-object";
export { NullableDateTimeVO } from "./nullable-date-time.value-object";
export { NullableDoubleVO } from "./nullable-double.value-object";
export { NullableEmailVO } from "./nullable-email.value-object";
export { NullableIntegerVO } from "./nullable-integer.value-object";
export { NullableNegativeDoubleVO } from "./nullable-negative-double.value-object";
export { NullableNegativeIntegerVO } from "./nullable-negative-integer.value-object";
export { NullableNegativeNumberVO } from "./nullable-negative-number.value-object";
export { NullableNumberVO } from "./nullable-number.value-object";
export { NullablePasswordVO } from "./nullable-password.value-object";
export { NullablePositiveDoubleVO } from "./nullable-positive-double.value-object";
export { NullablePositiveIntegerVO } from "./nullable-positive-integer.value-object";
export { NullablePositiveNumberVO } from "./nullable-positive-number.value-object";
export { NullableSchemaVO } from "./nullable-schema.value-object";
export { NullableSimpleUrlVO } from "./nullable-simple-url.value-object";
export { NullableSlugVO } from "./nullable-slug.value-object";
export { NullableStringVO } from "./nullable-string.value-object";
export { NullableStringArrayVO } from "./nullable-string-array.value-object";
export { NullableUrlVO } from "./nullable-url.value-object";
export { NullableUuidArrayVO } from "./nullable-uuid-array.value-object";
export { NullableUuidVO } from "./nullable-uuid.value-object";
