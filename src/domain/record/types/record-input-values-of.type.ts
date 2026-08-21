import type { InputValuesOf } from "@/domain/entity/types/input-values-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * A full record blueprint's worth of input values, every key required —
 * the type `setMany` takes a `Partial` of.
 *
 * A named alias of `InputValuesOf`, the all-required counterpart of
 * {@link RecordConstructionValuesOf}. It is also what a `derive` rule reads
 * its siblings from.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see {@link RecordConstructionValuesOf} — the relaxed construction variant.
 */
export type RecordInputValuesOf<
	PropertiesShape extends RecordPropertiesShapeBase,
> = InputValuesOf<PropertiesShape>;
