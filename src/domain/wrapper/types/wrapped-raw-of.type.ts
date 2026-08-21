import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { RawValueOf } from "@/domain/entity/types/raw-value-of.type";
import type { WrapperKind } from "./wrapper-kind.type";

/**
 * The **serialized** form of a wrapped blueprint property: an array of the
 * inner class's raw values for `arrayOf`, that raw value or `undefined` for
 * `optionalOf`, that raw value or `null` for `nullableOf`.
 *
 * Nothing is relaxed here, unlike {@link WrappedInputOf}: a serialized item is
 * a complete payload, identity included, which is what keeps `fromJSON` strict
 * all the way into a list.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see `RawValueOf` in `@/domain/entity/types` — the per-item definition.
 */
export type WrappedRawOf<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> = Kind extends "array"
	? readonly RawValueOf<Inner>[]
	: Kind extends "optional"
		? RawValueOf<Inner> | undefined
		: RawValueOf<Inner> | null;
