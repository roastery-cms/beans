/**
 * @module @roastery/beans/collections/value-objects
 *
 * Pre-built value-objects covering the same set of primitives exposed under
 * `@roastery/beans/collections/dtos`. Every VO follows the same contract:
 * extend `ValueObject<TValue, typeof XDTO>`, set `schema = XSchema`, expose a
 * `static make(value, info)` factory.
 *
 * Exports are listed alphabetically.
 *
 * Re-exports:
 * - {@link BooleanVO}      — boolean (`truthy()`, `falsy()`, `from()` sugar).
 * - {@link DateTimeVO}     — ISO 8601 timestamp (`now()` sugar).
 * - {@link DefinedStringVO} — non-empty string (reuses `StringDTO`/`StringSchema`).
 * - {@link SlugVO}         — auto-slugified URL-safe identifier.
 * - {@link StringArrayVO}  — array of strings.
 * - {@link UrlVO}          — HTTP/HTTPS URL.
 * - {@link UuidArrayVO}    — array of UUIDs.
 * - {@link UuidVO}         — UUID (`generate()` produces v7).
 */

export { BooleanVO } from "./boolean.value-object";
export { DateTimeVO } from "./date-time.value-object";
export { DefinedStringVO } from "./defined-string.value-object";
export { SlugVO } from "./slug.value-object";
export { StringArrayVO } from "./string-array.value-object";
export { UrlVO } from "./url.value-object";
export { UuidArrayVO } from "./uuid-array.value-object";
export { UuidVO } from "./uuid.value-object";
