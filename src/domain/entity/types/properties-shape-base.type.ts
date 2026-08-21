import type { AnyPropertyClass } from "./any-property-class.type";

/**
 * Base constraint of every entity blueprint: a plain object mapping each
 * domain property name to its `ValueObject`, `Entity` or `DomainRecord` class.
 *
 * The identity fields (`id`, `createdAt`, `updatedAt`) are supplied by the
 * `Entity` base and must **not** appear in a blueprint.
 *
 * @example
 * ```ts
 * const postProperties = { title: StringVO, author: Author };
 * ```
 */
export type PropertiesShapeBase = Record<string, AnyPropertyClass>;
