/**
 * @module @roastery/beans/collections/value-objects
 *
 * Pre-built value-objects covering the primitives exposed under
 * `@roastery/beans/collections/schemas`. Every VO extends the self-validating
 * `ValueObject` base and declares only `defineMeta()` (plus, where noted,
 * sugar statics or a `transform`).
 *
 * Exports are listed alphabetically.
 *
 * Re-exports:
 * - {@link BooleanVO}       — boolean (`truthy()`, `falsy()`, `from()` sugar).
 * - {@link DateTimeVO}      — ISO 8601 timestamp (`now()` sugar).
 * - {@link EmailVO}         — email address.
 * - {@link NumberVO}        — non-negative number.
 * - {@link PasswordVO}      — password with complexity rules.
 * - {@link SimpleUrlVO}     — URI of any protocol.
 * - {@link SlugVO}          — URL-safe identifier (auto-slugifies via `transform`).
 * - {@link StringVO}        — string of any length (reuses `StringSchema`).
 * - {@link StringArrayVO}   — array of strings.
 * - {@link UrlVO}           — HTTP/HTTPS URL.
 * - {@link UuidArrayVO}     — array of UUIDs.
 * - {@link UuidVO}          — UUID (`generate()` produces v7).
 */

export { BooleanVO } from "./boolean.value-object";
export { DateTimeVO } from "./date-time.value-object";
export { EmailVO } from "./email.value-object";
export { NumberVO } from "./number.value-object";
export { PasswordVO } from "./password.value-object";
export { SimpleUrlVO } from "./simple-url.value-object";
export { SlugVO } from "./slug.value-object";
export { StringVO } from "./string.value-object";
export { StringArrayVO } from "./string-array.value-object";
export { UrlVO } from "./url.value-object";
export { UuidArrayVO } from "./uuid-array.value-object";
export { UuidVO } from "./uuid.value-object";
