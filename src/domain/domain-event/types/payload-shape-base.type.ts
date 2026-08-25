import type { PropertiesShapeBase } from "@/domain/entity/types";

/**
 * Base constraint of every domain-event payload shape: a plain object mapping
 * each payload key to its `ValueObject`, `Entity`, `DomainRecord` or
 * multiplicity-wrapper class.
 *
 * @remarks
 * A named alias of `PropertiesShapeBase`, for the reason
 * `RecordPropertiesShapeBase` is one: the vocabulary of *a blueprint property*
 * belongs to no single pillar, and two copies of it could not be kept in step.
 * The pillar still gets its own name to spell.
 *
 * The alias is what makes one object serve **both** ends of the bus. A
 * `Record<string, AnyPropertyClass>` is already a valid `ReshapeShapeBase`, so
 * the same object is the target `reshapeTo` cuts the raising entity down to
 * *and* the blueprint the arriving payload is validated against. That is the
 * whole reason a payload shape is narrower than a reshape target: a
 * `ReshapeShapeBase` may nest an anonymous target (`{ author: { name: StringVO } }`),
 * which carries no schema and so could never validate on arrival. Name the
 * nested class instead — which is what validating it requires anyway.
 *
 * @example
 * ```ts
 * const shipmentShape = { total: IntegerVO, to: AddressCard };
 * const OrderShipped = defineDomainEvent("order.shipped", shipmentShape);
 * ```
 *
 * @see `PropertiesShapeBase` in `@/domain/entity/types` — the shared definition.
 * @see {@link EventPayloadDeclaration} — this, plus the two serialization directives.
 */
export type PayloadShapeBase = PropertiesShapeBase;
