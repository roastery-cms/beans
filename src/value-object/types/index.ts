/**
 * @module @roastery/beans/value-object/types
 *
 * Re-exports:
 * - {@link IValueObjectContext} — `{ name, source }` payload threaded into every value
 *   object so validation errors can pinpoint which field of which entity failed.
 * - {@link IValueObjectMetadata} — `{ default, schema }` payload describing *what* a value
 *   object is: its schema and the value it falls back to in demo mode. It is what
 *   `defineMeta()` returns.
 * - {@link ValueObjectClassLike} — a class reference, the minimum `metaOf` needs.
 */

export type { ValueObjectClassLike } from "./value-object-class-like.type";
export type { IValueObjectContext } from "./value-object-context.interface";
export type { IValueObjectMetadata } from "./value-object-metadata.interface";
