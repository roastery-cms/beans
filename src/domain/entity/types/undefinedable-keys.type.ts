import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * The blueprint keys whose property class accepts `undefined` as an input
 * value — built with `optionalVO`, or any custom value-object whose
 * `ValueType` includes `undefined`. `never` when no property does, which is
 * what collapses this back into the original behaviour for a blueprint with
 * no optional value-objects.
 *
 * These are the keys a construction payload may **omit**, on top of the ones
 * a rule already covers: the runtime already treats a missing key the same as
 * an explicit `undefined` (`buildContext` reads `raw[key]`, and a plain JS
 * object with no such key reads back `undefined` either way), so this only
 * teaches the *type* what the runtime already does — no change to
 * `buildContext`, `applyRuleDefaults` or `modelFor` is needed.
 *
 * Only value-object properties are considered: a nested entity or record is
 * never itself `undefined` (its `InputValueOf` is always an object), and
 * checking it through `InputValueOf` would recurse back into this same type
 * for a self-referencing blueprint (`{ child: Node }`), which TypeScript
 * rejects as a circular mapped type before it ever gets to resolve to
 * `false`. Reading `["prototype"]["value"]` directly — the same
 * sub-expression `InputValueOf` itself uses for its value-object branch —
 * gets the same answer without ever looking at the two nested branches.
 *
 * That is what keeps a record blueprint self-referencing through
 * `NestedRecordInput` expressible at the type level too; the cycle is still
 * rejected at runtime, by `CyclicEntityDefinitionException`.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — where these
 *   keys become optional alongside `RuledKeys`.
 * @see `NestedEntityInput` in `./nested-entity-input.type` — the nested
 *   counterpart, applying the same relaxation to a nested entity's own
 *   blueprint.
 */
export type UndefinedableKeys<PropertiesShape extends PropertiesShapeBase> = {
	[Key in DomainKeys<PropertiesShape>]: PropertiesShape[Key] extends AnyValueObjectClass
		? undefined extends PropertiesShape[Key]["prototype"]["value"]
			? Key
			: never
		: never;
}[DomainKeys<PropertiesShape>];
