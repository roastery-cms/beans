import type { PropertiesOfInstance } from "./properties-of-instance.type";

/**
 * Extracts the blueprint shape of an `Entity` **class** by looking through its
 * `prototype`. This is what lets the static `fromJSON` type its payload from
 * the subclass it is called on.
 *
 * @typeParam Class - The entity class type to inspect.
 *
 * @see {@link PropertiesOfInstance} — the instance-side counterpart.
 */
export type PropertiesOfClass<Class> = Class extends {
	readonly prototype: infer Instance;
}
	? PropertiesOfInstance<Instance>
	: never;
