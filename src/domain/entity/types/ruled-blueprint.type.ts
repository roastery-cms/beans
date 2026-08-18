import type { Rules } from "@roastery/terroir/symbols";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RulesOf } from "./rules-of.type";

/**
 * A blueprint that carries domain rules: the shape itself, plus the rule map
 * under the `Rules` symbol slot.
 *
 * Keeping the rules *inside* the blueprint is what makes the feature cheap.
 * The blueprint stays one value that satisfies {@link PropertiesShapeBase},
 * and because `Object.keys` and `Object.entries` skip symbol keys, every
 * traversal in the base — schema derivation, context building, accessor
 * installation, serialization — keeps seeing exactly the domain properties it
 * saw before, with no awareness of rules at all.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam Rule - The declared rule map, inferred from the literal so the
 *   ruled keys stay visible at the type level.
 *
 * @see `blueprint` in `@roastery/beans/domain/entity/helpers` — the only sanctioned
 *   way to build one.
 * @see `RuledKeys` in `./ruled-keys.type` — reads the ruled keys back out.
 */
export type RuledBlueprint<
	PropertiesShape extends PropertiesShapeBase,
	Rule extends RulesOf<PropertiesShape>,
> = PropertiesShape & {
	readonly [Rules]: Rule;
};
