/**
 * @module @roastery/beans/domain/entity/types
 *
 * Public types of the entity pillar. The supporting aliases the machinery is
 * built from live in sibling `*.type.ts` files and stay out of this barrel —
 * they are reachable through inference (and by direct path when needed).
 *
 * Re-exports:
 * - {@link AccessorsOf} — the interface to merge for blueprint-derived accessors.
 * - {@link BlueprintBuilder} — what `blueprint(shape)` returns, carrying `with`.
 * - {@link EntityClassOf} — the class `entityOf` returns.
 * - {@link EntityDefinition} — what `defineEntity()` returns.
 * - {@link EntityHas} — whether an entity's blueprint has a given shape, at the type level.
 * - {@link EntityHasShapeBase} — the base constraint of `EntityHas`'s `ExpectedShape`.
 * - {@link IEntity} — the behavioural contract of every entity.
 * - {@link IRawEntity} — the serialized identity fields.
 * - {@link PropertiesShapeBase} — the base constraint of every blueprint.
 * - {@link PropertyRule} — the domain rule behind one blueprint property.
 * - {@link RawContextOf} — the constructor payload of a subclass.
 * - {@link ReshapableModel} — what `reshapeTo` accepts as its source.
 * - {@link ReshapeShapeBase} — the base constraint of every `reshapeTo` target.
 * - {@link ReshapedTo} — what `reshapeTo` returns for a given target and source.
 * - {@link RuledBlueprint} — a blueprint carrying its rules.
 * - {@link RulesOf} — the rule map a blueprint may declare.
 * - {@link SerializedEntity} — what `toJSON()` returns / `fromJSON` accepts.
 */

export type { AccessorsOf } from "./accessors-of.type";
export type { EntityClassOf } from "./entity-class-of.type";
export type { BlueprintBuilder } from "./blueprint-builder.type";
export type { EntityDefinition } from "./entity-definition.type";
export type { EntityHas } from "./entity-has.type";
export type { EntityHasShapeBase } from "./entity-has-shape-base.type";
export type { IEntity } from "./entity.interface";
export type { PropertiesShapeBase } from "./properties-shape-base.type";
export type { PropertyRule } from "./property-rule.type";
export type { RawContextOf } from "./raw-context-of.type";
export type { IRawEntity } from "./raw-entity.interface";
export type { ReshapableModel } from "./reshapable-model.type";
export type { ReshapeShapeBase } from "./reshape-shape-base.type";
export type { ReshapedTo } from "./reshaped-to.type";
export type { RuledBlueprint } from "./ruled-blueprint.type";
export type { RulesOf } from "./rules-of.type";
export type { SetHandlerOf } from "./set-handler-of.type";
export type { SetHandlersOf } from "./set-handlers-of.type";
export type { SerializedEntity } from "./serialized-entity.type";
