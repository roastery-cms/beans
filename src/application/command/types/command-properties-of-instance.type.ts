import type { Properties } from "@roastery/terroir/symbols";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";

/**
 * Extracts the blueprint shape carried by a `Command` **instance** under the
 * `[Properties]` symbol.
 *
 * The match depends on {@link Properties} having a single declaration site —
 * `@roastery/terroir/symbols`, the same slot `Entity` fills. A second symbol
 * with the same description would silently never match, and this type would
 * resolve to `never` everywhere.
 *
 * @typeParam Instance - The command instance type to inspect.
 *
 * @see {@link CommandPropertiesOfClass} — the class-side counterpart.
 */
export type CommandPropertiesOfInstance<Instance> = Instance extends {
	[Properties]: infer Shape;
}
	? Shape extends CommandPropertiesShapeBase
		? Shape
		: never
	: never;
