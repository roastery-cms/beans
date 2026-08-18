/**
 * @module @roastery/beans/application/collections/value-objects/custom/types
 *
 * Application-layer alias onto
 * `@roastery/beans/domain/collections/value-objects/custom/types` — the exact
 * same types, re-exported here so a `Command` blueprint never has to reach
 * across into `@roastery/beans/domain` just to reuse one. Kept in sync by
 * hand with the domain barrel it mirrors; every name below is a straight
 * re-export, not a copy.
 *
 * Re-exports:
 * - {@link ICustomValueObjectArgs} — payload of the sugar factories: `{ options, default, …hooks }`.
 * - {@link IDefineValueObjectArgs} — payload of the core factory: `{ schema, default, …hooks }`.
 * - {@link IValueObjectHooks} — the `{ name, transform, validate }` shared by both.
 * - {@link ValueObjectClassOf} — the class every factory returns; the annotation
 *   that keeps declaration emit working.
 */

export type {
	ICustomValueObjectArgs,
	IDefineValueObjectArgs,
	ValueObjectClassOf,
	IValueObjectHooks,
} from "@/domain/collections/value-objects/custom/types";
