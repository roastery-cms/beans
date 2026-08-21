import type { SetHandlersOf } from "@/domain/entity/types/set-handlers-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The handler map `DomainRecord.onSet()` returns: at most one
 * `RecordSetHandlerOf` per domain property, each run just before that
 * property's value is built.
 *
 * A named alias of `SetHandlersOf`, for the same reason `RecordRulesOf` is a
 * named alias of `RulesOf` — see `RecordSetHandlerOf`. Pinned against the
 * entity pillar's definition in `record-type-parity.spec.ts`.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `DomainRecord.onSet` in `@/domain/record/record` — the hook returning it.
 * @see `SetHandlersOf` in `@/domain/entity/types/set-handlers-of.type` — the definition.
 *
 * @example
 * ```ts
 * class Money extends recordOf({ amount: IntegerVO }, "money") {
 *   protected override onSet(): RecordSetHandlersOf<typeof moneyProperties> {
 *     return {
 *       amount: (value) => {
 *         if (value < 0) throw new InvalidPropertyException("amount", "money");
 *       },
 *     };
 *   }
 * }
 * ```
 */
export type RecordSetHandlersOf<
	PropertiesShape extends RecordPropertiesShapeBase,
> = SetHandlersOf<PropertiesShape>;
