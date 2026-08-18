import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The raw wrapped value of one blueprint property's `ValueObject` class.
 *
 * Simpler than the entity pillar's `RawValueOf`: since a `Command` blueprint
 * only ever holds value-objects, there is no nested-entity branch to
 * discriminate — every property reads back as its VO's `value`. The same
 * type also serves as the input-side value: a value-object's constructor
 * accepts exactly the `ValueType` it exposes as `.value`.
 *
 * @typeParam Class - The blueprint property's value-object class.
 */
export type CommandRawValueOf<Class extends AnyValueObjectClass> =
	Class["prototype"]["value"];
