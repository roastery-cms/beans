/**
 * The method names in a grouped spec's `read` half.
 *
 * Read through `infer` on a structural match rather than by indexing
 * (`Spec["read"]`): `read` is optional, so a spec that omits it has no such
 * property to index, and the `infer` form resolves to `never` instead of
 * erroring. The match is written against `readonly (infer Name)[]`, which a
 * mutable tuple, a `readonly` tuple and a plain array all satisfy — so a
 * caller never needs `as const`.
 *
 * @typeParam Spec - The grouped spec to read.
 *
 * @see {@link RepositorySpecNamesOf} — where this is unioned with its write twin.
 */
export type ReadSpecEntriesOf<Spec> = Spec extends {
	readonly read: readonly (infer Name)[];
}
	? Name
	: never;
