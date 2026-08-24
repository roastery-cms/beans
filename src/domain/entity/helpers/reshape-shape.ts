import type { ReshapeShapeBase } from "../types/reshape-shape-base.type";

/**
 * Declares a **reshape target**: the shape `reshapeTo` cuts an instance down
 * to, where a key may hold a property class or a nested target of its own.
 *
 * Runtime-wise this is the identity function, exactly as `blueprint(...).done()`
 * is. It exists for the same two reasons: the `const` type parameter infers the
 * literal precisely (so `tags: tagCard` stays `typeof tagCard` and not
 * `ReshapeShapeBase`), and the object's identity is what a caller holds on to
 * and reuses across call sites.
 *
 * **A reshape target is not a blueprint,** and this is where that is spelled
 * out. It cannot be handed to `entityOf`/`recordOf` — those constrain to
 * `PropertiesShapeBase`, which admits classes only — and it carries no rules,
 * because a rule acts on construction input and `reshapeTo` reads an instance
 * that is already built. There is nothing to validate here either: the target
 * is checked against the *source* by `reshapeTo`, which is also where a
 * self-referencing target is caught.
 *
 * @typeParam Shape - The target shape, inferred from the literal.
 *
 * @param shape - The target: one property class or nested target per key.
 * @returns The same object, typed as the literal it was written as.
 *
 * @example
 * ```ts
 * import { reshapeShape, reshapeTo } from "@roastery/beans/domain/entity/helpers";
 *
 * const tagCard = reshapeShape({ name: StringVO });
 *
 * const postCard = reshapeShape({
 *   title: StringVO,   // a class, as before
 *   author: tagCard,   // nested target over `author: Author`
 *   tags: tagCard,     // nested target over `tags: arrayOf(PostTag)` — an array
 * });
 *
 * reshapeTo(postCard, post);
 * // { id, createdAt, title, author: { id, createdAt, name }, tags: [{ … }, …] }
 * ```
 *
 * @see `reshapeTo` in `./reshape-to` — what consumes a target.
 * @see `ReshapeShapeBase` in `../types/reshape-shape-base.type` — what a key may hold.
 * @see `blueprint` in `./blueprint` — the counterpart for a real blueprint,
 *   which admits classes only and carries rules.
 */
export function reshapeShape<const Shape extends ReshapeShapeBase>(
	shape: Shape,
): Shape {
	// The shape itself, not a copy: there is nothing to attach, and the object's
	// identity is what a caller reuses across call sites — the same reason
	// `blueprint(...).done()` hands back its argument.
	return shape;
}
