import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * Base constraint of every `Command` blueprint: a plain object mapping each
 * input field to its `ValueObject` class.
 *
 * Unlike `Entity`'s `PropertiesShapeBase`, this never accepts a nested
 * `Entity` (or `Command`) class — a `Command`'s input is a flat, validated
 * payload, not an aggregate. That also means there is no cycle to guard
 * against: a blueprint of value-objects alone cannot reference itself.
 *
 * @example
 * ```ts
 * const createUserProperties = { email: EmailVO, name: StringVO };
 * ```
 */
export type CommandPropertiesShapeBase = Record<string, AnyValueObjectClass>;
