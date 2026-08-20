/**
 * Rounds a number to a fixed number of decimal places. The canonical form
 * every `Double*VO` normalises its input into, *before* validation — a
 * `DoubleVO` declares "this is a fixed-precision decimal quantity", and this
 * is the only sense in which a JavaScript `number` can be *converted* to one:
 * `2.0` is not representable as distinct from `2`, so the decimal point
 * cannot be carried in the value itself, only the precision can be enforced.
 *
 * **The rounding is decimal-in-name-only, and that is a documented
 * infidelity**, in the same spirit as the in-memory repository's string
 * ordering being UTF-16 rather than a collation's. A binary float has no
 * exact decimal expansion, so `Math.round(value * 10 ** decimals)` inherits
 * whatever representation error the multiplication introduces: `1.005` at two
 * places rounds to `1`, not `1.01`, because `1.005 * 100` is `100.49999…`.
 * Every alternative trades that for a worse failure (the string-exponent
 * trick returns `NaN` for `1e-7` and `1e21`; `toFixed` disagrees on a
 * different set of inputs), so the straightforward form is kept and its limit
 * stated. Reach for a decimal library at the boundary if exact decimal
 * arithmetic is a domain requirement — money that must reconcile to the cent
 * usually is.
 *
 * Rounding is JavaScript's own half-up-toward-positive-infinity, so `-2.5`
 * rounds to `-2` rather than `-3`. `-0` is normalised to `0` for the same
 * round-trip reason `toInteger` documents.
 *
 * @param value - Any number.
 * @param decimals - How many decimal places to keep. Defaults to `2`, which
 *   is what the catalog's `Double*VO` classes use.
 * @returns The rounded value, with `-0` normalised to `0`.
 *
 * @example
 * ```ts
 * toDouble(1234.5678);   // 1234.57
 * toDouble(42);          // 42
 * toDouble(1.23456, 3);  // 1.235
 * toDouble(-0.001);      // 0, not -0
 * ```
 */
export function toDouble(value: number, decimals = 2): number {
	const factor = 10 ** decimals;
	const rounded = Math.round(value * factor) / factor;

	return rounded === 0 ? 0 : rounded;
}
