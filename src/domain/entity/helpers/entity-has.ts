import type { EntityHas, EntityHasShapeBase } from "../types";
import type { AnyEntityClass } from "../types/any-entity-class.type";
import type { AnyPropertyClass } from "../types/any-property-class.type";
import { definitionOf } from "./read-definition";

/**
 * Runtime counterpart of the `EntityHas` type: whether `entityClass`'s
 * blueprint carries every key of `expectedShape`, each backed by that key's
 * declared `ValueObject` class — or a subclass of it, such as a
 * domain-vocabulary alias (`class PostAuthorId extends UuidVO {}`) that adds
 * nothing of its own.
 *
 * Reads the blueprint via `definitionOf`, the same probe-based mechanism
 * `Entity.fromJSON` itself uses — no instance is constructed. Subclass
 * acceptance falls out of a plain `instanceof` check against the real
 * prototype chain, the same discriminant the base already uses at runtime to
 * tell an `Entity` class from a `ValueObject` one.
 *
 * @typeParam EntityType - The concrete `Entity` subclass to inspect.
 * @typeParam ExpectedShape - The keys and VO classes to check for.
 *
 * @param entityClass - The entity class to inspect, e.g. `Post`.
 * @param expectedShape - The keys and VO classes to check for, e.g. `{ slug: SlugVO }`.
 * @returns `true` when every key of `expectedShape` is present and backed by
 *   a matching (or subclassing) VO class.
 *
 * @example
 * ```ts
 * import { entityHas } from "@roastery/beans/domain/entity/helpers";
 *
 * entityHas(Post, { slug: SlugVO }); // true
 * entityHas(Post, { authorId: UuidVO }); // true — PostAuthorId is a UuidVO subclass
 * entityHas(Post, { publishedAt: UuidVO }); // false — no such key
 * ```
 *
 * @see `EntityHas` in `../types/entity-has.type` — the compile-time counterpart this mirrors.
 */
export function entityHas<
	EntityType extends AnyEntityClass,
	ExpectedShape extends EntityHasShapeBase,
>(
	entityClass: EntityType,
	expectedShape: ExpectedShape,
): EntityHas<EntityType, ExpectedShape> {
	const { properties } = definitionOf(entityClass);

	const matches = Object.entries(expectedShape).every(
		([key, expectedClass]) => {
			if (!Object.hasOwn(properties, key)) return false;

			const actualClass = properties[key] as AnyPropertyClass;

			return (
				actualClass === expectedClass ||
				actualClass.prototype instanceof expectedClass
			);
		},
	);

	return matches as EntityHas<EntityType, ExpectedShape>;
}
