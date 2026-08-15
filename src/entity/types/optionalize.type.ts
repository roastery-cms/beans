/**
 * Makes a chosen set of keys optional on an object type, leaving the rest
 * required. Keys that are not part of the target are ignored.
 *
 * Blueprint rules produce this shape twice — once for the construction payload
 * and once for a nested entity's payload — and both go through here rather
 * than inlining the `Omit`/`Pick` pair, which is also what keeps TypeScript
 * from re-instantiating the (already deep) serialized types on every branch.
 *
 * @typeParam Target - The object type to relax.
 * @typeParam Keys - The keys to make optional.
 *
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — top-level use.
 * @see `NestedEntityInput` in `./nested-entity-input.type` — nested use.
 */
export type Optionalize<Target, Keys> = Omit<Target, Keys & keyof Target> &
	Partial<Pick<Target, Keys & keyof Target>>;
