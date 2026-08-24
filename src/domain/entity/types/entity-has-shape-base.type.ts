import type { AnyPropertyClass } from "./any-property-class.type";

/**
 * Base constraint of `EntityHas`'s `ExpectedShape` argument: a plain object
 * mapping each field a caller wants to assert on to the class it must be
 * backed by — any of the four kinds a blueprint value may have, exactly as
 * {@link PropertiesShapeBase} admits them.
 *
 * It is the same record as a blueprint, and deliberately so: the question
 * `EntityHas` answers is "does this key hold *this*?", and the vocabulary the
 * caller writes the expectation in has to be the vocabulary the blueprint was
 * written in. A shape restricted to value-objects could not express
 * `{ tags: arrayOf(PostTag) }` — which is not an exotic case but the ordinary
 * one the moment an aggregate composes another.
 *
 * The wrapper a caller passes here is read for its two statics alone
 * (`wraps`, `wrapperKind`), never constructed, so writing `arrayOf(PostTag)`
 * inline in the argument is safe — see `entityHas`.
 *
 * @example
 * ```ts
 * type Expected = {
 *   slug: typeof SlugVO;
 *   author: typeof Author;
 *   price: typeof Money;
 *   tags: typeof PostTags; // arrayOf(PostTag)
 * };
 * ```
 *
 * @see {@link EntityHas} — the only consumer.
 * @see {@link PropertiesShapeBase} — the blueprint constraint this mirrors.
 */
export type EntityHasShapeBase = Record<string, AnyPropertyClass>;
