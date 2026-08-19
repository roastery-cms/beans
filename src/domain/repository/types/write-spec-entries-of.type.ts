/**
 * The method names in a grouped spec's `write` half.
 *
 * `ReadSpecEntriesOf`'s twin, structurally identical and read the same way —
 * through `infer` on an optional property, so an omitted `write` resolves to
 * `never` rather than erroring. Kept as two named types instead of one
 * parametrized by the property name: a mapped-key indirection would be harder
 * to read than the duplicated three lines, the same call the pillars already
 * make for `readDefinition`.
 *
 * @typeParam Spec - The grouped spec to read.
 *
 * @see {@link RepositorySpecNamesOf} — where this is unioned with its read twin.
 */
export type WriteSpecEntriesOf<Spec> = Spec extends {
	readonly write: readonly (infer Name)[];
}
	? Name
	: never;
