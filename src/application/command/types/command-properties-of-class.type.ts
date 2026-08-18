import type { CommandPropertiesOfInstance } from "./command-properties-of-instance.type";

/**
 * Extracts the blueprint shape of a `Command` **class** by looking through
 * its `prototype`. This is what lets the static `fromJSON` type its payload
 * from the subclass it is called on.
 *
 * @typeParam Class - The command class type to inspect.
 *
 * @see {@link CommandPropertiesOfInstance} — the instance-side counterpart.
 */
export type CommandPropertiesOfClass<Class> = Class extends {
	readonly prototype: infer Instance;
}
	? CommandPropertiesOfInstance<Instance>
	: never;
