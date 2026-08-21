/**
 * @module @roastery/beans/domain/record/types
 *
 * Public types of the record pillar. The supporting aliases the machinery is
 * built from live in sibling `*.type.ts` files and stay out of this barrel —
 * they are reachable through inference (and by direct path when needed).
 *
 * Several of them are named aliases of the entity pillar's equivalents rather
 * than second definitions. That is deliberate and limited to one class of
 * type: the vocabulary of *a blueprint property* (`AnyPropertyClass` and
 * everything mapped over it) belongs to neither pillar, and both pillars'
 * blueprints admit exactly the same three property kinds — so two copies could
 * not be kept in step, since each would have to reference the other. What the
 * record pillar defines for itself is everything that touches identity, which
 * is where the two genuinely diverge.
 *
 * Re-exports:
 * - {@link AnyRecordClass} — the widest record class type, one branch of `AnyPropertyClass`.
 * - {@link IRecord} — the behavioural contract of every record.
 * - {@link NestedRecordInput} — the input payload of a record-valued key.
 * - {@link RawRecordContextOf} — the constructor payload of a subclass.
 * - {@link RecordAccessorsOf} — the interface to merge for blueprint-derived accessors.
 * - {@link RecordClassOf} — the class `recordOf` returns.
 * - {@link RecordDefinition} — what `defineRecord()` returns.
 * - {@link RecordPropertiesShapeBase} — the base constraint of every record blueprint.
 * - {@link RecordRulesOf} — the rule map a record blueprint may declare.
 * - {@link SerializedRecord} — what `toJSON()` returns / `fromJSON` accepts.
 */

export type { AnyRecordClass } from "./any-record-class.type";
export type { NestedRecordInput } from "./nested-record-input.type";
export type { RawRecordContextOf } from "./raw-record-context-of.type";
export type { RecordAccessorsOf } from "./record-accessors-of.type";
export type { RecordClassOf } from "./record-class-of.type";
export type { RecordDefinition } from "./record-definition.type";
export type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";
export type { RecordRulesOf } from "./record-rules-of.type";
export type { RecordSetHandlerOf } from "./record-set-handler-of.type";
export type { RecordSetHandlersOf } from "./record-set-handlers-of.type";
export type { IRecord } from "./record.interface";
export type { SerializedRecord } from "./serialized-record.type";
