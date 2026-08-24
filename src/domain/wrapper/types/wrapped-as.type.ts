import type { WrapperKind } from "./wrapper-kind.type";

/**
 * How a multiplicity shapes a value: many of it for `arrayOf`, it or
 * `undefined` for `optionalOf`, it or `null` for `nullableOf`.
 *
 * The one statement of that rule. Every `Wrapped*Of` type is a per-item type
 * function applied under a multiplicity — `WrappedInputOf` over `InputValueOf`,
 * `WrappedRawOf` over `RawValueOf`, `WrappedReadOf` over `WrappedItemReadOf`,
 * and `ProjectedOnto`'s wrapper branch over itself — and each of them used to
 * spell the same three-way conditional out again. They differ only in the
 * per-item half, which is exactly what a parameter is for: change how a
 * multiplicity is expressed and it changes here, once, rather than in four
 * places that must be kept in step.
 *
 * Takes the already-resolved **value**, not the class, which is what lets a
 * caller whose per-item type is not `Something<Inner>` — `ProjectedOnto`, whose
 * per-item type takes a target shape as well — reuse it unchanged.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Value - The per-item type the multiplicity is applied over.
 *
 * @example
 * ```ts
 * type A = WrappedAs<"array", string>;    // readonly string[]
 * type B = WrappedAs<"optional", string>; // string | undefined
 * type C = WrappedAs<"nullable", string>; // string | null
 * ```
 *
 * @see {@link WrapperKind} — the three multiplicities.
 * @see {@link WrappedRawOf} — the serialized application of this.
 */
export type WrappedAs<Kind extends WrapperKind, Value> = Kind extends "array"
	? readonly Value[]
	: Kind extends "optional"
		? Value | undefined
		: Value | null;
