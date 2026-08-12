/**
 * @module @roastery/beans/value-object/types
 *
 * Re-exports:
 * - {@link IValueObjectContext} — `{ name, source }` payload threaded into every value object
 *   so validation errors can pinpoint which field of which entity failed.
 * - {@link IValueObjectMetadata} — `{ default, model }` payload describing *what* a value
 *   object is: its schema and the value it falls back to in demo mode. It is what the v2
 *   base's `defineMeta()` returns.
 */

export type { IValueObjectContext } from "./value-object-context.interface";
export type { IValueObjectMetadata } from "./value-object-metadata.interface";
