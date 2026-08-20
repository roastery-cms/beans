import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Placeholder default. `0` rather than `NumberVO`'s `42` because it is the
 * value most likely to survive the common bounds (`minimum: 0`); anything
 * stricter — `exclusiveMinimum: 0`, `minimum: 1` — fails the factory's eager
 * check and asks for an explicit default.
 */
const NUMBER_PLACEHOLDER = 0;

/**
 * Builds a numeric `ValueObject` **class** constrained by TypeBox number
 * options (`minimum`, `maximum`, `multipleOf`, …).
 *
 * For integers, pass `options: { multipleOf: 1 }` — or reach for
 * `defineValueObject({ schema: t.Integer(…) })`, which emits `type: "integer"`
 * in the JSON Schema rather than a divisibility constraint.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 * @param args - Schema options, demo-mode default, and behaviour hooks.
 * @returns The generated numeric value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   placeholder `0`) does not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 *
 * @example
 * ```ts
 * const RoastScore = customNumberVO({
 * 	options: { minimum: 0, maximum: 100 },
 * 	name: "RoastScore",
 * });
 *
 * const beanProperties = { score: RoastScore };
 * ```
 */
export function customNumberVO<Sensitive extends boolean = false>(
	args: ICustomValueObjectArgs<number, t.NumberOptions, Sensitive> = {},
): ValueObjectClassOf<number, t.TNumber, Sensitive> {
	const { default: fallback = NUMBER_PLACEHOLDER, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Number(options),
	});
}
