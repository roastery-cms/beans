import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrappedItemReadOf } from "./wrapped-item-read-of.type";
import type { WrapperKind } from "./wrapper-kind.type";
import type { WrappedAs } from "./wrapped-as.type";

/**
 * What a wrapped blueprint key reads back as — through `get`, through the
 * derived accessor, and through the wrapper's own `unwrap()`.
 *
 * **Reads are unwrapped**, deliberately: `post.tags` is the `readonly
 * PostTag[]` itself, not a collection object with verbs of its own. The
 * wrapper exists to state a multiplicity, not to become a domain concept —
 * anything wanting behaviour over the list belongs on the owning aggregate.
 * The cost is stated rather than hidden: there is no `.add()`, and appending
 * goes through `set` with the whole list (see `arrayOf`'s own TSDoc).
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see {@link WrappedItemReadOf} — the per-item rule this applies a multiplicity over.
 * @see {@link WrappedAs} — the multiplicity rule this applies its per-item
 *   type through, shared with every other `Wrapped*Of`.
 */
export type WrappedReadOf<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> = WrappedAs<Kind, WrappedItemReadOf<Inner>>;
