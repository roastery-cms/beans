/**
 * @module @roastery/beans/application/collections/value-objects/custom
 *
 * Application-layer alias onto
 * `@roastery/beans/domain/collections/value-objects/custom` — the exact same
 * factories, re-exported here so a `Command` blueprint never has to reach
 * across into `@roastery/beans/domain` just to build an inline-constrained
 * value-object. Kept in sync by hand with the domain barrel it mirrors;
 * every name below is a straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link customArrayVO}  — array constrained by an item schema.
 * - {@link customBinaryVO} — binary payload, stored as a base64 string.
 * - {@link customDoubleVO} — fixed-precision decimal of either sign (rounds to 2 places via `transform`).
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

export {
	customArrayVO,
	customBinaryVO,
	customDoubleVO,
	customEnumVO,
	customNumberVO,
	customObjectVO,
	customRecordVO,
	customStringVO,
	decodeBase64,
	defineValueObject,
	encodeBase64,
	nullableVO,
	optionalVO,
	unionVO,
} from "@/domain/collections/value-objects/custom";
