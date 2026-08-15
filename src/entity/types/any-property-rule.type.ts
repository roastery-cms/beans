import type { AnyPropertyClass } from "./any-property-class.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { PropertyRule } from "./property-rule.type";

/**
 * A {@link PropertyRule} with both parameters widened — what the machinery
 * handles once it stops caring *which* blueprint a rule came from.
 *
 * The precise form is for the declaration site, where inference makes `derive`
 * see the real payload and `default` the real value type. Iterating a rule map
 * happens at the widened form, the same way `AnyPropertyClass` and
 * `AnyValueObject` widen their precise counterparts.
 *
 * @see {@link PropertyRule} — the precise form the consumer writes.
 */
export type AnyPropertyRule = PropertyRule<
	PropertiesShapeBase,
	AnyPropertyClass
>;
