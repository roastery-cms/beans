import type { ReadSpecEntriesOf } from "./read-spec-entries-of.type";
import type { WriteSpecEntriesOf } from "./write-spec-entries-of.type";

/**
 * Flattens either spec form to the plain union of method names it selects —
 * the one place the two forms converge, and the reason they are
 * interchangeable everywhere downstream.
 *
 * A `string` spec is already that union and passes through untouched;
 * everything else is read as the grouped object, whose two halves are unioned
 * back together. The read/write split is not preserved here on purpose:
 * {@link SelectedRepositoryMethodsOf} re-derives it from the catalog, so the
 * grouped form cannot lie about which half a name belongs to (a `create`
 * listed under `read` is rejected by {@link RepositoryGroupedSpecOf}'s own
 * constraint first, and would be filtered out here regardless).
 *
 * @typeParam Spec - The spec, in either form.
 *
 * @example
 * ```ts
 * type A = RepositorySpecNamesOf<"findById" | "create">;
 * type B = RepositorySpecNamesOf<{ read: ["findById"]; write: ["create"] }>;
 * // A and B are both "findById" | "create"
 * ```
 *
 * @see {@link RepositorySpecOf} — the two forms this collapses.
 */
export type RepositorySpecNamesOf<Spec> = Spec extends string
	? Spec
	: ReadSpecEntriesOf<Spec> | WriteSpecEntriesOf<Spec>;
