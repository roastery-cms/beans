import type { AnyPropertyClass } from "./any-property-class.type";

/**
 * Base constraint of every **reshape target**: like a blueprint, but each key
 * may hold a nested target of its own instead of a class.
 *
 * A reshape target is deliberately *not* a blueprint. It never reaches
 * `entityOf`/`recordOf`, it builds nothing, and blueprint rules do not
 * participate in a projection — so widening `PropertiesShapeBase` to admit a
 * nested shape would only teach the entity pillar to accept something it
 * cannot construct. This is the wider bound, and it lives alongside the
 * narrower one rather than replacing it: `PropertiesShapeBase` is
 * `Record<string, AnyPropertyClass>` and is therefore assignable here, which
 * is what keeps every target written before nested shapes existed valid.
 *
 * **A class states multiplicity; a bare nested shape does not.** A key whose
 * target is a class must match the source's multiplicity exactly — the rule
 * `PropertyClassMatches` states and `propertyMatches` enforces. A key whose
 * target is a nested shape says nothing about multiplicity and adopts the
 * source's: an `arrayOf` stays an array, an `optionalOf` stays optional, a
 * `nullableOf` stays nullable, an unwrapped aggregate stays a single object.
 *
 * @example
 * ```ts
 * const authorCard = reshapeShape({ name: StringVO });
 *
 * const postCard = reshapeShape({
 *   title: StringVO,   // a value-object class, as before
 *   author: authorCard, // nested shape over `author: Author`
 *   tags: authorCard,   // nested shape over `tags: arrayOf(Author)` — an array
 * });
 * ```
 *
 * @see `reshapeShape` in `../helpers/reshape-shape` — the declaration helper.
 * @see `reshapeTo` in `../helpers/reshape-to` — what consumes one.
 * @see {@link PropertiesShapeBase} — the narrower bound, for blueprints proper.
 */
export type ReshapeShapeBase = {
	readonly [key: string]: AnyPropertyClass | ReshapeShapeBase;
};
