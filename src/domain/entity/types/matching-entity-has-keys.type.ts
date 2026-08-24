import type { AnyEntityClass } from "./any-entity-class.type";
import type { DomainKeys } from "./domain-keys.type";
import type { EntityHasShapeBase } from "./entity-has-shape-base.type";
import type { PropertiesOfClass } from "./properties-of-class.type";
import type { PropertyClassMatches } from "./property-class-matches.type";

/**
 * The `ExpectedShape` keys satisfied on `EntityType`'s blueprint: present, and
 * backed by a class {@link PropertyClassMatches} accepts — which covers all
 * four blueprint kinds (value-object, entity, record, multiplicity wrapper),
 * accepts a domain-vocabulary subclass in each of them, and treats the
 * multiplicity as part of the shape.
 *
 * `never` when no key of `ExpectedShape` is satisfied, which is what lets
 * `EntityHas` collapse to `false` for a wholly-unmatched shape.
 *
 * `PropertyClassMatches` carries the whole comparison, so this type states
 * only the two things that are its own: a key absent from the blueprint never
 * matches, and the result is the OR-collapse union `EntityHas` narrows back
 * into a single boolean.
 *
 * @typeParam EntityType - The concrete `Entity` subclass being asserted on.
 * @typeParam ExpectedShape - The keys and classes `EntityHas` checks for.
 *
 * @see {@link EntityHas} — the only consumer, which turns this OR-collapse
 *   union back into an all-keys-satisfied boolean.
 * @see {@link PropertyClassMatches} — the per-key rule, and where the
 *   subclass and multiplicity semantics are documented.
 * @see `RegistrableKeys` in `@roastery/beans/application/commands/types` — the
 *   idiom this mirrors: map each key to itself-or-`never`, then index to
 *   collapse into a union.
 */
export type MatchingEntityHasKeys<
	EntityType extends AnyEntityClass,
	ExpectedShape extends EntityHasShapeBase,
> = {
	[Key in DomainKeys<ExpectedShape>]: Key extends keyof PropertiesOfClass<EntityType>
		? PropertyClassMatches<
				PropertiesOfClass<EntityType>[Key],
				ExpectedShape[Key]
			> extends true
			? Key
			: never
		: never;
}[DomainKeys<ExpectedShape>];
