import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { PropertiesShapeBase } from "../types";
import type { AnyPropertyRule } from "../types/any-property-rule.type";
import type { BlueprintBuilder } from "../types/blueprint-builder.type";
import type { RuledBlueprint } from "../types/ruled-blueprint.type";
import type { RulesOf } from "../types/rules-of.type";
import { Rules } from "@roastery/terroir/symbols";

/**
 * Validates a rule map against the shape it annotates. TypeScript already
 * rejects both failures; this is the runtime half, for plain-JS callers and
 * for payloads crossing a package boundary untyped.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @param properties - The shape being annotated.
 * @param rules - The rule map to validate.
 *
 * @throws `InvalidEntityDefinitionException` — when a rule names a key outside
 *   the blueprint, or declares `default` and `derive` at once.
 */
function assertRules<PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
	rules: RulesOf<PropertiesShape>,
): void {
	for (const [key, rule] of Object.entries(rules) as Array<
		[string, AnyPropertyRule | undefined]
	>) {
		if (!Object.hasOwn(properties, key))
			throw new InvalidEntityDefinitionException(
				"blueprint",
				`Blueprint: the rule for "${key}" names a property the blueprint does not declare. A rule annotates an existing property; add "${key}" to the shape or drop the rule.`,
			);

		if (rule?.default !== undefined && rule.derive !== undefined)
			throw new InvalidEntityDefinitionException(
				"blueprint",
				`Blueprint: the rule for "${key}" declares both "default" and "derive". A property either falls back to a fixed value or is computed from its siblings — pick one.`,
			);
	}
}

/**
 * Declares a blueprint that carries **domain rules**: which properties may be
 * omitted from a construction payload, and how the base fills them.
 *
 * Rules are what let the domain's own language live in the blueprint instead
 * of in a hand-written constructor — "the slug comes from the name", "a tag is
 * visible by default" — and a subclass that needs neither keeps declaring a
 * plain object literal, unchanged.
 *
 * The two-phase call is what makes the derivations type-safe: a literal cannot
 * reference its own `typeof`, so the shape is fixed by the first call and only
 * then does `raw` become fully typed inside `with`. The first call returns
 * *only* `with` — the builder is deliberately not usable as a blueprint, so a
 * forgotten `.with(...)` is a type error rather than a `with` key leaking into
 * the entity's properties.
 *
 * @typeParam PropertiesShape - The blueprint shape, inferred from the literal.
 *
 * @param properties - The blueprint shape: one `ValueObject` or `Entity` class
 *   per domain property.
 * @returns A builder whose `with` attaches the rules and returns the blueprint
 *   — see {@link BlueprintBuilder.with} for what a rule may declare and how it
 *   resolves.
 *
 * @throws `InvalidEntityDefinitionException` — from `with`, when a rule names
 *   a key outside the blueprint or declares `default` and `derive` at once.
 *
 * @see {@link BlueprintBuilder} — the second phase, where the rules go.
 * @see `PropertyRule` in `@roastery/beans/entity/types` — what a rule may be.
 * @see `Entity` in `@roastery/beans` — applies the rules during construction.
 *
 * @example
 * ```ts
 * const postTagProperties = blueprint({
 *   name: TagName,
 *   slug: TagSlug,
 *   hidden: TagVisibility,
 * }).with({
 *   slug: { derive: (raw) => raw.name },  // omitted? comes from the name
 *   hidden: { default: false },           // the entity's default, not the VO's
 * });
 *
 * new PostTag({ name: "Alan Reis" }); // slug: "alan-reis", hidden: false
 * ```
 */
export function blueprint<const PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
): BlueprintBuilder<PropertiesShape> {
	return {
		/** @inheritDoc */
		with<const Rule extends RulesOf<PropertiesShape>>(
			rules: Rule,
		): RuledBlueprint<PropertiesShape, Rule> {
			assertRules(properties, rules);

			return Object.assign({}, properties, {
				[Rules]: rules,
			}) as RuledBlueprint<PropertiesShape, Rule>;
		},
	};
}
