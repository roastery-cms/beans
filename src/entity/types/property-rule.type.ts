import type { AnyPropertyClass } from "./any-property-class.type";
import type { InputValueOf } from "./input-value-of.type";
import type { InputValuesOf } from "./input-values-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * How one blueprint property is filled when the construction payload omits
 * it — the domain rule behind a property, as opposed to the class that
 * validates it.
 *
 * The two variants are mutually exclusive: a property either falls back to a
 * fixed `default` or is computed from its siblings by `derive`. Declaring both
 * is a compile error here (each variant forbids the other key) and an
 * `InvalidEntityDefinitionException` at runtime, so a plain-JS caller gets the
 * same answer.
 *
 * A `default` declared here belongs to the **entity**, and outranks the one
 * the value-object declares in its own `defineMeta` — that is the point of
 * writing it: `BooleanVO` defaults to `true`, while a given entity's `hidden`
 * flag may well default to `false`.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam Class - The blueprint property class the rule belongs to.
 *
 * @see {@link RulesOf} — the per-blueprint map of these.
 * @see `blueprint` in `@roastery/beans/entity/helpers` — how a rule is attached.
 *
 * @example
 * ```ts
 * { default: false }                  // the entity's own fallback
 * { derive: (raw) => raw.name }       // computed from a sibling
 * ```
 */
export type PropertyRule<
	PropertiesShape extends PropertiesShapeBase,
	Class extends AnyPropertyClass,
> =
	| {
			/**
			 * Fixed fallback, used whenever the payload omits the property — and
			 * only then: an explicit value wins, including an explicit `false`.
			 *
			 * It belongs to the **entity**, so it outranks the default the
			 * value-object declares in its own `defineMeta` (`BooleanVO` defaults
			 * to `true`; a given entity's `hidden` flag may default to `false`).
			 * It also applies in `demo()`, which is what keeps fixtures coherent.
			 *
			 * Two differences from a value-object's `meta.default` are worth
			 * knowing:
			 *
			 * - It is **not** a thunk. The discriminant that makes `meta.default`
			 *   lazy does not exist here, so a function would be stored as the
			 *   value itself. Anything computed belongs in `derive`, which runs
			 *   per construction rather than once at declaration.
			 * - It **does** go through the property's `transform`, so
			 *   `{ default: "My Cool Tag" }` on a slug property stores
			 *   `"my-cool-tag"`. (A `meta.default` skips `transform` and must be
			 *   declared already canonical.)
			 *
			 * It is validated like any other value: a default its own property
			 * rejects raises `InvalidPropertyException` on the first construction,
			 * not at declaration.
			 */
			readonly default: InputValueOf<Class>;
			readonly derive?: never;
	  }
	| {
			readonly default?: never;
			/**
			 * Computes the property from its siblings, whenever the payload omits
			 * it — and only then: an explicit value is never recomputed.
			 *
			 * @param raw - The payload as it stands when the derivation runs: every
			 *   `default` this blueprint declares is already applied, and every
			 *   sibling already built is already **normalised** — a `SlugVO`
			 *   sibling reads back slugified, a demo sibling reads back as its
			 *   declared default. Derivations run in **blueprint order** and see
			 *   the results of the earlier ones; one that reads a key derived
			 *   *after* it gets `undefined`, and the property's own validation
			 *   rejects the result. The parameter is typed as though every key were
			 *   present, which is the one place the types are more optimistic than
			 *   the runtime.
			 * @returns The raw value for the property, which then goes through the
			 *   property's own `transform` and validation like any other input — so
			 *   a derivation may return the un-normalised form (`raw.name` for a
			 *   slug) and let the value-object canonicalise it.
			 *
			 * @example
			 * ```ts
			 * { derive: (raw) => raw.name }                 // slug from the name
			 * { derive: (raw) => `${raw.prefix}: ${raw.title}` }
			 * ```
			 */
			readonly derive: (
				raw: Readonly<InputValuesOf<PropertiesShape>>,
			) => InputValueOf<Class>;
	  };
