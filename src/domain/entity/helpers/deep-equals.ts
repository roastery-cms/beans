/**
 * Structural equality over DTO values (primitives, arrays, plain objects).
 * DTOs are JSON-shaped by construction, so this coverage is sufficient — and
 * it avoids runtime-specific helpers (`Bun.deepEquals`) that would break Node
 * consumers.
 *
 * Arrays compare element-by-element (order-sensitive); plain objects compare
 * by key set and value; everything else falls back to strict equality. An
 * array never equals a non-array object.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` when both values are structurally identical.
 *
 * @see `Entity.setMany` — uses this to detect (and skip) no-op updates.
 *
 * @example
 * ```ts
 * import { deepEquals } from "@roastery/beans/domain/entity/helpers";
 *
 * deepEquals(["a", "b"], ["a", "b"]); // true
 * deepEquals({ a: 1 }, { a: 1, b: 2 }); // false
 * ```
 */
export function deepEquals(a: unknown, b: unknown): boolean {
	if (a === b) return true;

	if (Array.isArray(a) && Array.isArray(b))
		return (
			a.length === b.length &&
			a.every((item, index) => deepEquals(item, b[index]))
		);

	if (
		a !== null &&
		b !== null &&
		typeof a === "object" &&
		typeof b === "object" &&
		!Array.isArray(a) &&
		!Array.isArray(b)
	) {
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);

		return (
			aKeys.length === bKeys.length &&
			aKeys.every((key) =>
				deepEquals(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key],
				),
			)
		);
	}

	return false;
}
