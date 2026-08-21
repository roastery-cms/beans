import type { PropertiesShapeBase } from "@/domain/entity/types";

/**
 * Base constraint of every record blueprint: a plain object mapping each
 * domain property name to its `ValueObject`, `Entity` or `DomainRecord` class.
 *
 * A record blueprint accepts the **same** three property kinds an entity's
 * does, so this is a named alias of `PropertiesShapeBase` rather than a second
 * definition. Aliasing instead of redeclaring is deliberate: `AnyPropertyClass`
 * is the vocabulary of *a blueprint property*, not of either pillar, and two
 * copies of a union that must reference each other (an entity blueprint admits
 * records, a record blueprint admits entities) could not be kept in step. The
 * pillar still gets its own name to spell, which is what every `Record*` type
 * here is for.
 *
 * What a record does **not** get is the identity fields: `id`, `createdAt` and
 * `updatedAt` are not supplied by the base — they do not exist — and the base
 * rejects them as blueprint keys, so a record cannot grow them by hand either.
 *
 * @example
 * ```ts
 * const moneyProperties = { amount: PositiveIntegerVO, currency: CurrencyVO };
 * ```
 *
 * @see `PropertiesShapeBase` in `@/domain/entity/types` — the shared definition.
 */
export type RecordPropertiesShapeBase = PropertiesShapeBase;
