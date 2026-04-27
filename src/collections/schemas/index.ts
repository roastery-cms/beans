/**
 * @module @roastery/beans/collections/schemas
 *
 * Pre-built `Schema` instances — `Schema.make(XDTO)` per DTO — so consumers can
 * call `XSchema.match(value)` (or feed the schema to a value-object) without
 * having to wrap a raw DTO each time.
 *
 * Exports are listed alphabetically and mirror the order of
 * `@roastery/beans/collections/dtos`.
 *
 * Re-exports:
 * - {@link BooleanSchema}
 * - {@link DateTimeSchema}
 * - {@link EmailSchema}
 * - {@link IdObjectSchema}
 * - {@link NumberSchema}
 * - {@link PasswordSchema}
 * - {@link SimpleUrlSchema}
 * - {@link SlugSchema}
 * - {@link SlugObjectSchema}
 * - {@link StringSchema}
 * - {@link StringArraySchema}
 * - {@link UrlSchema}
 * - {@link UuidSchema}
 * - {@link UuidArraySchema}
 */

export { BooleanSchema } from "./boolean.schema";
export { DateTimeSchema } from "./date-time.schema";
export { EmailSchema } from "./email.schema";
export { IdObjectSchema } from "./id-object.schema";
export { NumberSchema } from "./number.schema";
export { PasswordSchema } from "./password.schema";
export { SimpleUrlSchema } from "./simple-url.schema";
export { SlugSchema } from "./slug.schema";
export { SlugObjectSchema } from "./slug-object.schema";
export { StringSchema } from "./string.schema";
export { StringArraySchema } from "./string-array.schema";
export { UrlSchema } from "./url.schema";
export { UuidSchema } from "./uuid.schema";
export { UuidArraySchema } from "./uuid-array.schema";
