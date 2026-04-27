/**
 * @module @roastery/beans/value-object
 *
 * Public entry point for the value-object pillar.
 *
 * Re-exports:
 * - {@link ValueObject} — abstract base class for immutable, schema-validated wrappers.
 *
 * The {@link IValueObjectMetadata} interface lives one level deeper at
 * `@roastery/beans/value-object/types` and is **not** re-exported here, mirroring how
 * the package keeps types behind a dedicated `/types` subpath.
 */

export { ValueObject } from "./value-object";
