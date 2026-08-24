/**
 * Makes a chosen set of keys optional on an object type, leaving the rest
 * required. Keys that are not part of the target are ignored.
 *
 * Used by `SerializedValuesOf` to make the `undefined`-accepting keys optional
 * in an entity's serialized form, and by `ReshapedValuesOf` to relax the same
 * keys in a projection, rather than inlining the `Omit`/`Pick` pair in either —
 * which is also what keeps TypeScript from re-instantiating the (already deep)
 * serialized types on every branch.
 *
 * The input-side types spell the same relaxation out inline instead
 * (`ConstructionValuesOf`'s `Exclude`/`Extract` split, which
 * `NestedEntityInput` reuses wholesale): they relax two key sets rather than
 * one, and splitting the mapped type in two is clearer there than nesting
 * `Optionalize` around a union.
 *
 * @typeParam Target - The object type to relax.
 * @typeParam Keys - The keys to make optional.
 *
 * @see `SerializedValuesOf` in `./serialized-values-of.type` — the serialized
 *   form's caller.
 * @see `ReshapedValuesOf` in `./reshaped-values-of.type` — the projection's,
 *   relaxing the same key set read off `EffectiveShapeOf`.
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — the
 *   input-side counterpart, which spells the split out inline.
 */
export type Optionalize<Target, Keys> = Omit<Target, Keys & keyof Target> &
	Partial<Pick<Target, Keys & keyof Target>>;
