/**
 * A `ValueObject` class reference — not an instance. The minimum `metaOf`
 * needs to build its probe: something with a prototype to `Object.create`.
 *
 * Deliberately looser than the entity pillar's `AnyValueObjectClass` (which
 * also carries a construct signature): reading metadata never constructs.
 *
 * @see `metaOf` in `@/value-object/helpers` — the consumer of this shape.
 */
export type ValueObjectClassLike = {
	readonly prototype: object;
};
