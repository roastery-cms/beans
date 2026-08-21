import type { RulesOf } from "@/domain/entity/types";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The rule map a record blueprint may declare through `blueprint().with()` —
 * a `default` or a `derive` per property, never both.
 *
 * A named alias of `RulesOf`, which is already generic over
 * `PropertiesShapeBase` and needs no widening to accept a record's blueprint:
 * `blueprint` itself is imported from the entity pillar unmodified, the same
 * decision the command pillar already made.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `blueprint` in `@/domain/entity/helpers/blueprint` — what consumes it.
 */
export type RecordRulesOf<PropertiesShape extends RecordPropertiesShapeBase> =
	RulesOf<PropertiesShape>;
