/**
 * Orders two **serialized** property values, the way `Array.prototype.sort`
 * wants: negative when `a` comes first, positive when `b` does, `0` when
 * neither wins.
 *
 * `beans` ships no comparator anywhere else — `deepEquals` answers equality and
 * nothing more — so this is it, and it is deliberately three lines. It can be,
 * because the *type* did the hard part first: `RepositoryOrderKeysOf` only ever
 * admits a key whose raw value is a single primitive, so `a < b` here is
 * comparing two strings, two numbers or two booleans and never a mix.
 * `false < true` holds in JavaScript, which is the same order SQL gives a
 * boolean column.
 *
 * Nullish sorts **last**, matching SQL's `NULLS LAST` default for an ascending
 * order — and note the caller inverts the whole comparison for `"desc"`, so
 * nullish then leads, exactly as `ORDER BY x DESC` puts `NULL` first.
 *
 * Two fidelity gaps worth stating, in the same spirit as this double already
 * declaring that `toBe` will not hold across a round trip:
 *
 * - String order is JavaScript's, which compares UTF-16 code units. A real
 *   database compares by collation, so `"Z"` vs `"á"` can disagree. Cases where
 *   that matters are cases where the collation is part of the requirement, and
 *   no in-memory double can stand in for it.
 * - A `customBinaryVO` key is a base64 `string`, so it is orderable here and
 *   the order means nothing. Documented rather than engineered around, the same
 *   way `findManyByIds` beating a blueprint key called `ids` is.
 *
 * @param a - The left value.
 * @param b - The right value.
 *
 * @returns `-1`, `0` or `1`.
 *
 * @example
 * ```ts
 * compareRaw("alan", "bruno"); // -1
 * compareRaw(2, 10);           // -1  (numeric, not lexicographic)
 * compareRaw(null, "alan");    //  1  (nullish last)
 * ```
 *
 * @see {@link RepositoryOrderKeysOf} — the type guaranteeing one primitive per key.
 */
export function compareRaw(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (a === null || a === undefined) return 1;
	if (b === null || b === undefined) return -1;

	return (a as never) < (b as never) ? -1 : 1;
}
