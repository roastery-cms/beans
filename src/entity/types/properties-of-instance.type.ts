import type { Properties } from "@roastery/terroir/symbols";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * Extracts the blueprint shape carried by an `Entity` **instance** under the
 * `[Properties]` symbol.
 *
 * The match depends on {@link Properties} having a single declaration site —
 * `@roastery/terroir/symbols`. A second symbol with the same description would
 * silently never match, and this type would resolve to `never` everywhere.
 *
 * @typeParam Instance - The entity instance type to inspect.
 *
 * @see {@link PropertiesOfClass} — the class-side counterpart.
 */
export type PropertiesOfInstance<Instance> = Instance extends {
	[Properties]: infer Shape;
}
	? Shape extends PropertiesShapeBase
		? Shape
		: never
	: never;
