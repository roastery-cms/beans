import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { ReshapeKeys } from "./reshape-keys.type";
import type { ReshapeShapeBase } from "./reshape-shape-base.type";

/**
 * The blueprint a reshape target **behaves like**, key by key: the target's own
 * class where it declares one, and the source's class where the target declares
 * a nested shape instead.
 *
 * It exists so the one rule about which serialized keys may be omitted stays
 * stated in one place. `SerializedValuesOf` relaxes exactly
 * `UndefinedableKeys<Shape>`; a projection has to relax the same keys, but for
 * a nested-shape key the multiplicity that decides it lives on the source.
 * Substituting the source's class for those keys and handing the result to the
 * *same* `UndefinedableKeys` reuses the rule rather than restating it — so
 * `editor: authorCard` over `editor: optionalOf(Author)` is relaxed exactly as
 * `editor: optionalOf(AuthorCard)` already is.
 *
 * The trailing `extends infer Effective extends PropertiesShapeBase` is what
 * makes the promise in the name good: a mapped type over two independent
 * generic parameters is not provably a blueprint until it is instantiated, and
 * `UndefinedableKeys` asks for one. It lives here, where the promise is made,
 * rather than at the single call site that would otherwise have to restate it.
 *
 * A key the source does not declare resolves to `never`, which relaxes nothing.
 * That case never survives to runtime — `reshapeTo` throws
 * `InvalidPropertyException` for it before projecting — so there is nothing for
 * the type to promise about it.
 *
 * @typeParam Shape - The reshape target.
 * @typeParam SourceShape - The blueprint the source instance was built from.
 *
 * @example
 * ```ts
 * // target { title: StringVO, editor: authorCard }
 * // source { title: StringVO, editor: optionalOf(Author) }
 * type Effective = EffectiveShapeOf<typeof target, typeof source>;
 * // { title: typeof StringVO; editor: typeof PostEditor } — the optionalOf wrapper
 * ```
 *
 * @see `UndefinedableKeys` in `./undefinedable-keys.type` — the rule this feeds.
 * @see `ReshapedValueOf` in `./reshaped-value-of.type` — where the same
 *   construct-signature probe discriminates a class from a nested shape.
 */
export type EffectiveShapeOf<
	Shape extends ReshapeShapeBase,
	SourceShape extends PropertiesShapeBase,
> = {
	[Key in ReshapeKeys<Shape>]: Shape[Key] extends {
		new (...args: never[]): unknown;
	}
		? Shape[Key]
		: Key extends keyof SourceShape
			? SourceShape[Key]
			: never;
} extends infer Effective extends PropertiesShapeBase
	? Effective
	: never;
