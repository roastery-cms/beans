import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { DomainKeys } from "./domain-keys.type";
import type { EntityHasShapeBase } from "./entity-has-shape-base.type";
import type { PropertiesOfClass } from "./properties-of-class.type";

/**
 * The `ExpectedShape` keys satisfied on `EntityType`'s blueprint: present,
 * backed by a value-object (not a nested entity), and that value-object's
 * prototype structurally extends the expected class's own prototype — true
 * both for an exact class match and for a domain-vocabulary alias
 * (`class TagSlug extends SlugVO {}`) that adds nothing of its own.
 *
 * Comparing `["prototype"]` in full, not just `["prototype"]["value"]`, is
 * what tells apart two VO classes that happen to wrap the same runtime
 * value type but validate it differently — `SlugVO` and `StringVO` both
 * wrap `string`, but declare a different `[Meta]["schema"]`.
 *
 * `never` when no key of `ExpectedShape` is satisfied, which is what lets
 * `EntityHas` collapse to `false` for a wholly-unmatched shape.
 *
 * Structural, not exact, for the same reason `RegistrableKeys` already
 * documents for its own gate: a domain-vocabulary alias that overrides
 * nothing is structurally indistinguishable from its parent, in either
 * direction — this type cannot tell "is a subclass of" apart from "is
 * structurally identical to" when the alias adds nothing of its own. That
 * is exactly what makes the aliasing pattern satisfy the check, not a
 * loophole introduced here.
 *
 * @typeParam EntityType - The concrete `Entity` subclass being asserted on.
 * @typeParam ExpectedShape - The keys and VO classes `EntityHas` checks for.
 *
 * @see {@link EntityHas} — the only consumer, which turns this OR-collapse
 *   union back into an all-keys-satisfied boolean.
 * @see `RegistrableKeys` in `@roastery/beans/application/command-registry/types` — the
 *   idiom this mirrors: map each key to itself-or-`never`, then index to
 *   collapse into a union.
 */
export type MatchingEntityHasKeys<
	EntityType extends AnyEntityClass,
	ExpectedShape extends EntityHasShapeBase,
> = {
	[Key in DomainKeys<ExpectedShape>]: Key extends keyof PropertiesOfClass<EntityType>
		? PropertiesOfClass<EntityType>[Key] extends AnyValueObjectClass
			? PropertiesOfClass<EntityType>[Key]["prototype"] extends ExpectedShape[Key]["prototype"]
				? Key
				: never
			: never
		: never;
}[DomainKeys<ExpectedShape>];
