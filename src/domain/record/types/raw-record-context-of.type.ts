import type { RecordConstructionValuesOf } from "./record-construction-values-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The constructor payload of a `DomainRecord` subclass: one raw input value
 * per blueprint property, ruled and `undefined`-accepting keys optional.
 *
 * The entity counterpart, `RawContextOf`, is this intersected with
 * `IdentityInput` — the all-or-nothing `id`/`createdAt`/`updatedAt` rule. A
 * record has no identity to pass, so there is nothing to intersect, and
 * passing an `id` is a plain excess-property error rather than a half-identity
 * one.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @example
 * ```ts
 * new Money({ amount: 1000, currency: "BRL" });
 * ```
 *
 * @see `RawContextOf` in `@/domain/entity/types` — the entity counterpart.
 */
export type RawRecordContextOf<
	PropertiesShape extends RecordPropertiesShapeBase,
> = RecordConstructionValuesOf<PropertiesShape>;
