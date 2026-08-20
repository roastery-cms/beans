/**
 * Truncates a number toward zero, so `2.7` becomes `2` and `-2.7` becomes
 * `-2`. The canonical form every `Integer*VO` normalises its input into,
 * *before* validation — which is what lets a caller pass a computed float
 * where the blueprint declares an integer, instead of having to round at
 * every call site.
 *
 * Truncation, not rounding: it discards the fractional part rather than
 * choosing a nearest neighbour, so the result is always the integer between
 * the input and zero. (Note this differs from PostgreSQL's `::int` cast,
 * which rounds.)
 *
 * `Math.trunc` yields `-0` for any input in `(-1, 0)`, and `-0` does not
 * survive a `toJSON`/`fromJSON` round-trip identically — `JSON.stringify(-0)`
 * is `"0"`, while `Object.is(-0, 0)` is `false`, so a persisted entity would
 * compare unequal to the one it was built from. It is normalised to `0` here.
 *
 * @param value - Any number.
 * @returns Its integer part, with `-0` normalised to `0`.
 *
 * @example
 * ```ts
 * toInteger(2.7);   // 2
 * toInteger(-2.7);  // -2
 * toInteger(-0.5);  // 0, not -0
 * ```
 */
export function toInteger(value: number): number {
	const truncated = Math.trunc(value);

	return truncated === 0 ? 0 : truncated;
}
