/**
 * @module @roastery/beans/domain/collections/schemas
 *
 * Pre-built TypeBox schemas for the most common scalar, array, and object shapes
 * across the Roastery domain. The side-effect import at the top of this file
 * registers the custom string formats (`slug`, `simple-url`, `url`, `uuid`,
 * `email`, `date-time`) used by the schemas below — keeping it here means
 * importing **any** schema from this barrel automatically wires the formats up.
 *
 * Exports are listed alphabetically, each with a matching `*VO` value-object
 * where it makes sense.
 *
 * Re-exports:
 * - {@link BooleanSchema}     — boolean.
 * - {@link DateTimeSchema}    — ISO 8601 date-time string.
 * - {@link EmailSchema}       — email address.
 * - {@link NumberSchema}      — non-negative number.
 * - {@link PasswordSchema}    — string with complexity rules.
 * - {@link SimpleUrlSchema}   — any-protocol URI.
 * - {@link SlugSchema}        — URL-safe slug.
 * - {@link StringSchema}      — string of any length.
 * - {@link StringArraySchema} — array of strings.
 * - {@link UrlSchema}         — HTTP/HTTPS URL.
 * - {@link UuidSchema}        — UUID string.
 * - {@link UuidArraySchema}   — array of UUID strings.
 */

import "@roastery/terroir/schema/formats";

export { BooleanSchema } from "./boolean.schema";
export { DateTimeSchema } from "./date-time.schema";
export { EmailSchema } from "./email.schema";
export { NumberSchema } from "./number.schema";
export { PasswordSchema } from "./password.schema";
export { SimpleUrlSchema } from "./simple-url.schema";
export { SlugSchema } from "./slug.schema";
export { StringSchema } from "./string.schema";
export { StringArraySchema } from "./string-array.schema";
export { UrlSchema } from "./url.schema";
export { UuidSchema } from "./uuid.schema";
export { UuidArraySchema } from "./uuid-array.schema";
