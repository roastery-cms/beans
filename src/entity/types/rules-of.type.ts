import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { PropertyRule } from "./property-rule.type";

/**
 * The rule map a blueprint may carry: at most one {@link PropertyRule} per
 * domain property. Keys outside the blueprint are rejected at compile time,
 * and again at runtime for plain-JS callers.
 *
 * Properties without a rule keep the behaviour they always had — required in
 * the construction payload, falling back to the value-object's own default
 * only in demo mode.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see `blueprint` in `@roastery/beans/entity/helpers` — takes a value of this
 *   type and returns the ruled blueprint.
 *
 * @example
 * ```ts
 * {
 *   slug: { derive: (raw) => raw.name },
 *   hidden: { default: false },
 * }
 * ```
 */
export type RulesOf<PropertiesShape extends PropertiesShapeBase> = {
	readonly [Key in DomainKeys<PropertiesShape>]?: PropertyRule<
		PropertiesShape,
		PropertiesShape[Key]
	>;
};
