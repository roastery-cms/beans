import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RuledBlueprint } from "./ruled-blueprint.type";
import type { RulesOf } from "./rules-of.type";

/**
 * What `blueprint(shape)` returns: the second half of the two-phase
 * declaration, exposing **only** {@link BlueprintBuilder.with}.
 *
 * The split exists because a literal cannot reference its own `typeof` — the
 * first call fixes the shape, which is what lets `with` type the `raw` a
 * derivation receives. Exposing nothing but `with` is deliberate too: the
 * builder is not usable as a blueprint, so a forgotten `.with(...)` fails at
 * compile time instead of leaking a `with` key into the entity's properties.
 *
 * @typeParam PropertiesShape - The blueprint shape fixed by the first call.
 *
 * @see `blueprint` in `@roastery/beans/entity/helpers` — returns this.
 */
export type BlueprintBuilder<PropertiesShape extends PropertiesShapeBase> = {
	/**
	 * Attaches the domain rules to the shape and returns the finished
	 * blueprint.
	 *
	 * A rule map carries at most one rule per property, and every rule is
	 * either a `default` or a `derive` — never both:
	 *
	 * - **`{ default: value }`** — a fixed fallback belonging to the *entity*,
	 *   which outranks the one the value-object declares in its own
	 *   `defineMeta`. Unlike that one, it is **not** a thunk (a function would
	 *   be stored as the value itself) and it **does** go through the
	 *   property's `transform`, so `{ default: "My Cool Tag" }` on a slug
	 *   property stores `"my-cool-tag"`. It is validated like any other value:
	 *   a default its own property rejects raises `InvalidPropertyException` on
	 *   the first construction, not here.
	 * - **`{ derive: (raw) => value }`** — computes the property from its
	 *   siblings. Use it for anything expensive or dependent; a `default` is
	 *   evaluated once at declaration, a `derive` on every construction that
	 *   needs it.
	 *
	 * Either one makes the property **optional in the construction payload**,
	 * which is the whole type-level effect. Resolution order is explicit value
	 * > `default` > `derive`, and an explicit value wins even when falsy.
	 *
	 * The rules also apply in `demo()` — that is what keeps fixtures coherent
	 * — and to a nested entity's payload, but they never re-fire on
	 * `set`/`setMany`: mutation always takes an explicit value. The derived
	 * schema and `fromJSON`'s strictness are untouched, since rules act on
	 * input only and `toJSON()` always emits every property.
	 *
	 * @typeParam Rule - The rule map, inferred from the literal so the ruled
	 *   keys stay visible at the type level.
	 *
	 * @param rules - The rules, keyed by property name. Every key must be a
	 *   property the shape declares.
	 * @returns The blueprint, carrying its rules under the `Rules` symbol slot.
	 *
	 * @throws `InvalidEntityDefinitionException` — when a rule names a property
	 *   the blueprint does not declare, or declares `default` and `derive` at
	 *   once. Both are compile errors too; this is the runtime half, for
	 *   plain-JS callers.
	 *
	 * @example
	 * ```ts
	 * blueprint({ name: TagName, slug: TagSlug, hidden: TagVisibility }).with({
	 *   slug: { derive: (raw) => raw.name },  // omitted? comes from the name
	 *   hidden: { default: false },           // the entity's default, not the VO's
	 * });
	 * ```
	 */
	with<const Rule extends RulesOf<PropertiesShape>>(
		rules: Rule,
	): RuledBlueprint<PropertiesShape, Rule>;
};
