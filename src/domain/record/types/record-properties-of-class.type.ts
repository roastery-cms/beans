import type { RecordPropertiesOfInstance } from "./record-properties-of-instance.type";

/**
 * Recovers the blueprint shape from a record **class**, by stepping through
 * its `prototype` into {@link RecordPropertiesOfInstance}.
 *
 * Used by the statics, whose polymorphic `this` only knows the class.
 *
 * @typeParam Class - The record class.
 */
export type RecordPropertiesOfClass<Class> = Class extends {
	readonly prototype: infer Instance;
}
	? RecordPropertiesOfInstance<Instance>
	: never;
