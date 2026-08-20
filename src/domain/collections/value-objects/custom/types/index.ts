/**
 * @module @roastery/beans/domain/collections/value-objects/custom/types
 *
 * Types of the custom value-object factories.
 *
 * Re-exports:
 * - {@link IBinaryValueObjectOptions} — `customBinaryVO`'s options: `t.StringOptions` plus `minBytes`/`maxBytes`.
 * - {@link IDoubleValueObjectArgs} — `customDoubleVO`'s payload: `ICustomValueObjectArgs` plus `decimals`.
 * - {@link ICustomValueObjectArgs} — payload of the sugar factories: `{ options, default, …hooks }`.
 * - {@link IDefineValueObjectArgs} — payload of the core factory: `{ schema, default, …hooks }`.
 * - {@link IValueObjectHooks} — the `{ name, transform, validate }` shared by both.
 * - {@link ValueObjectClassOf} — the class every factory returns; the annotation
 *   that keeps declaration emit working.
 */

export type { IBinaryValueObjectOptions } from "./binary-value-object-options.interface";
export type { ICustomValueObjectArgs } from "./custom-value-object-args.interface";
export type { IDefineValueObjectArgs } from "./define-value-object-args.interface";
export type { IDoubleValueObjectArgs } from "./double-value-object-args.interface";
export type { ValueObjectClassOf } from "./value-object-class-of.type";
export type { IValueObjectHooks } from "./value-object-hooks.interface";
