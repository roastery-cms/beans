import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * The domain property keys of a blueprint — its string keys, excluding the
 * symbol slot a ruled blueprint carries its rules under.
 *
 * Every mapped type over a blueprint goes through this instead of bare
 * `keyof`: the rules are metadata about the properties, not a property, so
 * they must not surface as an accessor, a schema field, a serialized key or a
 * construction argument. `Object.keys` already skips symbols at runtime; this
 * is the type-level counterpart.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see `Rules` in `@roastery/beans/entity/rules.symbol` — the key filtered out.
 */
export type DomainKeys<PropertiesShape extends PropertiesShapeBase> = Extract<
	keyof PropertiesShape,
	string
>;
