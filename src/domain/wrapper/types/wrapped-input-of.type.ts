import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { InputValueOf } from "@/domain/entity/types/input-value-of.type";
import type { WrapperKind } from "./wrapper-kind.type";
import type { WrappedAs } from "./wrapped-as.type";

/**
 * The **input** form of a wrapped blueprint property: a list of the inner
 * class's own input values for `arrayOf`, and that same input value widened
 * with `undefined` / `null` for `optionalOf` / `nullableOf`.
 *
 * Everything the inner class already relaxes travels through untouched, item
 * by item: a wrapped entity's identity stays optional-all-or-nothing, its
 * ruled keys stay omittable, and so do its `optionalVO`-backed ones — because
 * `InputValueOf` is the *same* type the unwrapped key would have used. That is
 * what makes `new Post({ tags: [{ name: "Alan Reis" }] })` mean exactly what
 * `new PostTag({ name: "Alan Reis" })` means.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see {@link WrappedRawOf} — the serialized counterpart, where nothing is relaxed.
 * @see `InputValueOf` in `@/domain/entity/types` — the per-item definition.
 * @see {@link WrappedAs} — the multiplicity rule this applies its per-item
 *   type through, shared with every other `Wrapped*Of`.
 */
export type WrappedInputOf<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> = WrappedAs<Kind, InputValueOf<Inner>>;
