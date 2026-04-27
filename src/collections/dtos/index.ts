/**
 * @module @roastery/beans/collections/dtos
 *
 * Pre-built TypeBox DTOs for the most common scalar, array, and object shapes
 * across the Roastery domain. The side-effect import at the top of this file
 * registers the custom string formats (`slug`, `simple-url`, `url`, `uuid`,
 * `email`, `date-time`) used by the DTOs below — keeping it here means
 * importing **any** DTO from this barrel automatically wires the formats up.
 *
 * Exports are listed alphabetically. Each `*DTO` ships with a matching `*Schema`
 * (one level over at `@roastery/beans/collections` schemas) and, where it makes
 * sense, a `*VO` value-object.
 *
 * Re-exports:
 * - {@link BooleanDTO}     — boolean.
 * - {@link DateTimeDTO}    — ISO 8601 date-time string.
 * - {@link EmailDTO}       — email address.
 * - {@link IdObjectDTO}    — `{ id: UuidDTO }`.
 * - {@link NumberDTO}      — non-negative number.
 * - {@link PasswordDTO}    — string with complexity rules.
 * - {@link SimpleUrlDTO}   — any-protocol URI.
 * - {@link SlugDTO}        — URL-safe slug.
 * - {@link SlugObjectDTO}  — `{ slug: SlugDTO }`.
 * - {@link StringDTO}      — non-empty string.
 * - {@link StringArrayDTO} — array of strings.
 * - {@link UrlDTO}         — HTTP/HTTPS URL.
 * - {@link UuidDTO}        — UUID string.
 * - {@link UuidArrayDTO}   — array of UUID strings.
 */

import "@roastery/terroir/schema/formats";

export { BooleanDTO } from "./boolean.dto";
export { DateTimeDTO } from "./date-time.dto";
export { EmailDTO } from "./email.dto";
export { IdObjectDTO } from "./id-object.dto";
export { NumberDTO } from "./number.dto";
export { PasswordDTO } from "./password.dto";
export { SimpleUrlDTO } from "./simple-url.dto";
export { SlugDTO } from "./slug.dto";
export { SlugObjectDTO } from "./slug-object.dto";
export { StringDTO } from "./string.dto";
export { StringArrayDTO } from "./string-array.dto";
export { UrlDTO } from "./url.dto";
export { UuidDTO } from "./uuid.dto";
export { UuidArrayDTO } from "./uuid-array.dto";
