import type { Properties } from "@roastery/terroir/symbols";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * Recovers the blueprint shape from a record **instance** type, by reading the
 * `[Properties]` slot the base fills during construction.
 *
 * @typeParam Instance - The record instance type.
 *
 * @see {@link RecordPropertiesOfClass} — the class-side entry point.
 */
export type RecordPropertiesOfInstance<Instance> = Instance extends {
	[Properties]: infer Shape;
}
	? Shape extends RecordPropertiesShapeBase
		? Shape
		: never
	: never;
