import type { WrappableClass } from "./wrappable-class.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * Whether one blueprint property class satisfies another: the single rule
 * `EntityHas` applies to every key, across all four kinds a blueprint value
 * may have — a `ValueObject`, an `Entity`, a `DomainRecord` or a multiplicity
 * wrapper around one of those three.
 *
 * Two classes match when `Actual`'s prototype structurally extends
 * `Expected`'s — true both for an exact class and for a domain-vocabulary
 * alias (`class TagSlug extends SlugVO {}`, `class DraftPost extends Post {}`)
 * that adds nothing of its own. Comparing `["prototype"]` in full, not a
 * sub-expression of it, is what tells apart two classes that happen to wrap
 * the same runtime value but validate it differently — `SlugVO` and
 * `StringVO` both wrap `string`, but declare a different `[Meta]["schema"]`.
 *
 * **Multiplicity is part of the shape.** A wrapper matches only another
 * wrapper of the same `wrapperKind`, and then the rule recurses into what the
 * two `wraps` — so `arrayOf(PostTag)` matches `arrayOf(BaseTag)` when
 * `PostTag extends BaseTag`, and matches neither `PostTag` on its own nor
 * `optionalOf(PostTag)`. The unwrapped class and the wrapped one are not
 * interchangeable anywhere else in the package (`optionalOf` alone makes a key
 * omittable, a wrapped key derives no repository method), and they are not
 * interchangeable here either.
 *
 * The wrapper branches probe the two statics **inline** rather than testing
 * `extends AnyWrapperClass`, for the reason
 * `docs/decisions/wrapper-type-constraints.md` records as measured: the full
 * structural form drags `AnyWrapper`'s five members into the comparison at
 * every key and TypeScript gives up with **TS2589**. The recursion is at most
 * one level deep — a wrapper does not wrap a wrapper.
 *
 * Structural, not exact, in every branch. A domain-vocabulary alias that
 * overrides nothing is structurally indistinguishable from its parent, in
 * either direction; that is exactly what makes the aliasing pattern satisfy
 * the check, not a loophole introduced here.
 *
 * **The one place the two halves cannot agree** follows from that: two classes
 * minted by separate factory calls with identical arguments — `customRecordVO()`
 * twice, `defineValueObject` twice — are the same *type* and different
 * *objects*, so this resolves to `true` while the runtime `propertyMatches`
 * answers `false`. It is the type level that cannot see the difference, not the
 * runtime that is wrong, and it is the usual corollary of the package-wide rule
 * that a class-returning factory is called once, at module scope. A wrapper is
 * not affected: `arrayOf(PostTag)` called twice compares by what it `wraps`,
 * which is the same `PostTag` both times.
 *
 * @typeParam Actual - The class the blueprint declares for the key.
 * @typeParam Expected - The class the caller asserts the key is backed by.
 *
 * @example
 * ```ts
 * type A = PropertyClassMatches<typeof PostAuthorId, typeof UuidVO>; // true — subclass
 * type B = PropertyClassMatches<typeof StringVO, typeof SlugVO>; // false — different schema
 * type C = PropertyClassMatches<typeof PostTags, typeof PostTags>; // true — arrayOf(PostTag), either instance of the class
 * type D = PropertyClassMatches<typeof PostTags, typeof PostTag>; // false — a list is not a PostTag
 * ```
 *
 * @see {@link MatchingEntityHasKeys} — the mapped type applying this per key.
 * @see `propertyMatches` in `../helpers/entity-has` — the runtime half, which
 *   answers the same question about the same four kinds.
 */
export type PropertyClassMatches<Actual, Expected> = Actual extends {
	readonly wrapperKind: infer ActualKind extends WrapperKind;
	readonly wraps: infer ActualInner extends WrappableClass;
}
	? Expected extends {
			readonly wrapperKind: infer ExpectedKind extends WrapperKind;
			readonly wraps: infer ExpectedInner extends WrappableClass;
		}
		? [ActualKind] extends [ExpectedKind]
			? [ExpectedKind] extends [ActualKind]
				? PropertyClassMatches<ActualInner, ExpectedInner>
				: false
			: false
		: false
	: Expected extends { readonly wrapperKind: WrapperKind }
		? false
		: Actual extends { readonly prototype: infer ActualPrototype }
			? Expected extends { readonly prototype: infer ExpectedPrototype }
				? ActualPrototype extends ExpectedPrototype
					? true
					: false
				: false
			: false;
