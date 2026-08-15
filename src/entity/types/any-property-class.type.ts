import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * What a blueprint value may be: a `ValueObject` class or another `Entity`
 * class. Every conditional in the blueprint type machinery discriminates
 * between the two branches of this union.
 *
 * @see {@link PropertiesShapeBase} — the record of these that forms a blueprint.
 */
export type AnyPropertyClass = AnyValueObjectClass | AnyEntityClass;
