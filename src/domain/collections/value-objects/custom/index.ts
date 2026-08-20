/**
 * @module @roastery/beans/domain/collections/value-objects/custom
 *
 * Factories that **return a `ValueObject` class**, not an instance — so a
 * blueprint can declare a constrained property inline instead of paying a
 * schema plus a subclass for every domain rule:
 *
 * ```ts
 * const postProperties = {
 * 	title: customStringVO({ options: { minLength: 4, maxLength: 120 }, default: "title" }),
 * 	views: customNumberVO({ options: { minimum: 0 } }),
 * 	tags: customArrayVO(SlugSchema, { options: { minItems: 1 }, default: ["tag"] }),
 * 	status: customEnumVO(["draft", "published", "archived"], { default: "draft" }),
 * 	subtitle: optionalVO(StringSchema),
 * 	deletedAt: nullableVO(DateTimeSchema),
 * 	metadata: customRecordVO(),
 * };
 * ```
 *
 * Everything here lowers into {@link defineValueObject}, which is public too:
 * reach for it when the schema already exists (`EmailSchema` plus one extra
 * rule) and there is nothing for a sugar factory to build.
 *
 * **Call the factories at module scope, once.** Each call mints a fresh schema
 * and a fresh class; calling one inside `defineEntity()` or `defineMeta()`
 * defeats the compiled-validator and aggregate-model caches, which are keyed by
 * object identity. Two calls with identical arguments also produce two
 * *different* classes, so `instanceof` does not relate them.
 *
 * The side-effect import below registers the custom string formats (`slug`,
 * `url`, `uuid`, `email`, `date-time`, `simple-url`), so
 * `customStringVO({ options: { format: "slug" } })` validates against a
 * registered format rather than silently against none.
 *
 * Re-exports:
 * - {@link customArrayVO}  — array constrained by an item schema.
 * - {@link customBinaryVO} — binary payload, stored as a base64 string.
 * - {@link customDoubleVO} — fixed-precision decimal, rounding to `decimals` places before validation.
 * - {@link customEnumVO}   — one of a fixed set of literal values, built on `t.Enum`.
 * - {@link nullableVO}     — wraps a schema so its value may also be `null` (key stays required).
 * - {@link customNumberVO} — number constrained by bounds.
 * - {@link customObjectVO} — object with a declared shape (`default` required).
 * - {@link optionalVO}     — wraps a schema so its value may also be `undefined` (key becomes optional).
 * - {@link customRecordVO} — free-form object, no declared shape.
 * - {@link customStringVO} — string constrained by length, pattern or format.
 * - {@link unionVO}        — value matching any one of several schemas.
 * - {@link defineValueObject} — the core the others lower into.
 * - {@link encodeBase64} / {@link decodeBase64} — bytes in, bytes out, for a
 *   `customBinaryVO`-backed property.
 */

import "@roastery/terroir/schema/formats";

export { customArrayVO } from "./array.factory";
export { customBinaryVO } from "./binary.factory";
export { defineValueObject } from "./define-value-object";
export { customDoubleVO } from "./double.factory";
export { customEnumVO } from "./enum.factory";
export { decodeBase64 } from "./helpers/decode-base64";
export { encodeBase64 } from "./helpers/encode-base64";
export { nullableVO } from "./nullable.factory";
export { customNumberVO } from "./number.factory";
export { customObjectVO } from "./object.factory";
export { optionalVO } from "./optional.factory";
export { customRecordVO } from "./record.factory";
export { customStringVO } from "./string.factory";
export { unionVO } from "./union.factory";
