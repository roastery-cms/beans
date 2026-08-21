import type { AnyPropertyClass } from "@/domain/entity/types/any-property-class.type";
import type { SetHandlerOf } from "@/domain/entity/types/set-handler-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * One property's set handler on a record: the business rule a blueprint key
 * runs **before** its value is built, on both construction and mutation.
 *
 * A named alias of `SetHandlerOf`, which is already generic over
 * `PropertiesShapeBase` and needs no widening to accept a record's blueprint —
 * the same decision `RecordRulesOf` already makes, and for the same reason:
 * both pillars' blueprints admit exactly the same property kinds, so two
 * independent copies could not be kept in step.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 * @typeParam Class - The property class the handled key is backed by.
 *
 * @see `SetHandlerOf` in `@/domain/entity/types/set-handler-of.type` — the definition.
 * @see `RecordSetHandlersOf` in `./record-set-handlers-of.type` — the map these live in.
 */
export type RecordSetHandlerOf<
	PropertiesShape extends RecordPropertiesShapeBase,
	Class extends AnyPropertyClass,
> = SetHandlerOf<PropertiesShape, Class>;
