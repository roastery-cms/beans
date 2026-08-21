import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { AnyWrapper } from "./any-wrapper.type";
import type { WrapperKind } from "./wrapper-kind.type";

/**
 * Widest multiplicity-wrapper **class** type: something carrying the two
 * statics every wrapper declares — the class it `wraps` and the
 * `wrapperKind` it wraps it with — whose instances are containers.
 *
 * The fourth shape a blueprint value may have, and the one that stays disjoint
 * from the other three **by construction**: `AnyEntityClass` and
 * `AnyRecordClass` both declare `readonly wraps?: never`, which nothing
 * carrying a real `wraps` can satisfy, and neither of them declares
 * `wrapperKind` at all. So neither extends this and this extends neither —
 * branch order in the blueprint conditionals stays a readability choice, the
 * same guarantee `AnyEntity` / `AnyRecord` already give each other.
 *
 * The two statics are also the **only** source both halves of the package
 * read: `isWrapperClass` tests `wrapperKind` at runtime, and `WrappedInputOf`
 * / `WrappedReadOf` / `WrappedRawOf` are applied to them at the type level.
 *
 * **The blueprint conditionals do not test `extends AnyWrapperClass`, and
 * cannot.** They probe the two statics inline instead —
 * `Class extends { readonly wrapperKind: infer Kind extends WrapperKind;
 * readonly wraps: infer Inner extends WrappableClass }` — because testing a
 * concrete property class against this whole type drags `AnyWrapper`'s five
 * members into the comparison at every key of every blueprint, and TypeScript
 * gives up on a real aggregate with **TS2589** (`Type instantiation is
 * excessively deep and possibly infinite`). That was measured, not guessed:
 * the full form failed on two existing suites the moment it landed. The probe
 * asks the same question — nothing but a wrapper carries both statics — and
 * hands back `Kind` and `Inner` already narrowed, which the indexed-access
 * form (`Class["wrapperKind"]`) could not do anyway without every union member
 * declaring the key.
 *
 * This type stays the vocabulary: it is what `isWrapperClass` narrows to, what
 * `wrapperModelFor` accepts, and what {@link AnyPropertyClass} unions in.
 *
 * @see `AnyPropertyClass` in `@/domain/entity/types` — the union this belongs to.
 * @see `isWrapperClass` in `@/shared/helpers/is-wrapper-class` — the runtime half.
 */
export type AnyWrapperClass = {
	readonly wraps: WrappableClass;
	readonly wrapperKind: WrapperKind;
	readonly prototype: AnyWrapper;
	new (payload: never): AnyWrapper;
};
