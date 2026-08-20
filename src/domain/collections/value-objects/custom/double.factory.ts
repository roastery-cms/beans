import { t } from "@roastery/terroir";
import { toDouble } from "../helpers/to-double";
import { defineValueObject } from "./define-value-object";
import type { IDoubleValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Placeholder default, matching `customNumberVO`'s own `0` — the value most
 * likely to survive the common bounds. It needs no rounding of its own, and
 * `transform` never runs over a default anyway.
 */
const DOUBLE_PLACEHOLDER = 0;

/** The precision the catalog's `Double*VO` classes use. */
const DEFAULT_DECIMALS = 2;

/**
 * Builds a fixed-precision decimal `ValueObject` **class**: a numeric VO
 * whose `transform` rounds every incoming value to `decimals` places before
 * validation, plus the usual TypeBox number options (`minimum`, `maximum`, …).
 *
 * This is the escape hatch for the catalog's `DoubleVO`/`PositiveDoubleVO`/
 * `NegativeDoubleVO`, which are all fixed at two places. Reach for it whenever
 * two is the wrong precision — a latitude, a unit price carried to four
 * places, a rate.
 *
 * The rounding goes through {@link toDouble}, so it inherits that helper's
 * documented limit: decimal rounding over a binary float is approximate, and
 * `1.005` at two places rounds to `1` rather than `1.01`. Use a decimal
 * library at the boundary when exact decimal arithmetic is a domain
 * requirement.
 *
 * A caller's own `transform` is composed **after** the rounding, never
 * replaced by it — so a hook can still clamp, take an absolute value, or
 * anything else, and sees an already-rounded number.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 * @param args - Schema options, precision, demo-mode default, and behaviour
 *   hooks.
 * @returns The generated decimal value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   placeholder `0`) does not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see {@link toDouble} — the rounding, and its limits.
 *
 * @example
 * ```ts
 * const Latitude = customDoubleVO({
 * 	decimals: 6,
 * 	options: { minimum: -90, maximum: 90 },
 * 	name: "Latitude",
 * });
 *
 * const placeProperties = { latitude: Latitude };
 * ```
 */
export function customDoubleVO<Sensitive extends boolean = false>(
	args: IDoubleValueObjectArgs<Sensitive> = {},
): ValueObjectClassOf<number, t.TNumber, Sensitive> {
	const {
		decimals = DEFAULT_DECIMALS,
		default: fallback = DOUBLE_PLACEHOLDER,
		options,
		transform,
		...hooks
	} = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Number(options),
		transform: (value) => {
			const rounded = toDouble(value, decimals);

			return transform ? transform(rounded) : rounded;
		},
	});
}
