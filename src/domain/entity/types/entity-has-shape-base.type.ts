import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * Base constraint of `EntityHas`'s `ExpectedShape` argument: a plain object
 * mapping each field a caller wants to assert on to the `ValueObject` class
 * it must be backed by — or a subclass of it.
 *
 * Unlike `PropertiesShapeBase`, this never accepts a nested `Entity` class:
 * `EntityHas` answers a value-object-level question ("is this field backed
 * by this VO, or a domain-vocabulary alias of it?"), not an aggregate-shape
 * one — the same reasoning `CommandPropertiesShapeBase` already applies to a
 * `Command`'s own blueprint.
 *
 * @example
 * ```ts
 * type Expected = { slug: typeof SlugVO; authorId: typeof UuidVO };
 * ```
 *
 * @see {@link EntityHas} — the only consumer.
 * @see `CommandPropertiesShapeBase` in `@roastery/beans/application/command/types` — the
 *   application-layer counterpart, structurally identical and for the same reason.
 */
export type EntityHasShapeBase = Record<string, AnyValueObjectClass>;
