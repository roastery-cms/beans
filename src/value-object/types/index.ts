/**
 * @module @roastery/beans/value-object/types
 *
 * Re-exports:
 * - {@link IValueObjectMetadata} — `{ name, source }` payload threaded into every value object
 *   so validation errors can pinpoint which field of which entity failed.
 */

export type { IValueObjectMetadata } from "./value-object-metadata.interface";
