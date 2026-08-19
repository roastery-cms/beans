import { deepEquals } from "@/domain/entity/helpers";

/**
 * The first unique key whose value is already taken by another stored row, or
 * `undefined` when the candidate is free to be written.
 *
 * Three rules, each of them chosen to match what a relational database
 * actually does rather than what is convenient for a test double:
 *
 * - **A nullish value never conflicts.** `null` is not equal to `null` in SQL,
 *   so a `UNIQUE` index accepts any number of rows holding it — which is what
 *   makes a unique-but-optional column expressible at all. A key backed by an
 *   `Optional<X>VO`/`Nullable<X>VO` therefore only ever collides on real values.
 * - **Comparison goes through `deepEquals`, never `===`.** A `StringArrayVO`
 *   serializes to an array, and reference equality would never match one —
 *   silently, which is the worst way for a constraint to fail.
 * - **`id` is skipped.** Identity is the primary key, checked on its own where
 *   the failure has a proper name; on `update`, `selfId` already excludes the
 *   row being written.
 *
 * @param rows - The store, keyed by entity id.
 * @param uniqueKeys - The keys declared unique, from `uniqueKeysOf`.
 * @param candidate - The serialized row about to be written.
 * @param selfId - The id of the row being replaced, excluded from the scan.
 *   Omitted on insert, which is what makes an unchanged value pass on `update`
 *   while a value borrowed from a sibling row does not.
 * @returns The colliding key's name, or `undefined` when there is none.
 *
 * @example
 * ```ts
 * const conflict = uniqueConflictOf(rows, uniqueKeys, entity.toJSON(), entity.id);
 *
 * if (conflict) throw new ConflictException("in-memory-repository");
 * ```
 *
 * @see `uniqueKeysOf` in `@roastery/beans/domain/entity/helpers` — where the keys come from.
 */
export function uniqueConflictOf(
	rows: ReadonlyMap<string, Record<string, unknown>>,
	uniqueKeys: readonly string[],
	candidate: Record<string, unknown>,
	selfId?: string,
): string | undefined {
	for (const key of uniqueKeys) {
		// The primary key has its own check, with its own exception message.
		if (key === "id") continue;

		const value = candidate[key];

		// SQL semantics: NULL never equals NULL, so a nullish value is free.
		if (value === null || value === undefined) continue;

		for (const [id, row] of rows) {
			if (id === selfId) continue;

			if (deepEquals(row[key], value)) return key;
		}
	}

	return undefined;
}
