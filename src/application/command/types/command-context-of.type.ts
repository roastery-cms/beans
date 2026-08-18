import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";

/**
 * The built property map of a `Command`: one value-object instance per
 * blueprint key. This is the type of `[Context]` — unlike the entity
 * pillar's `ContextOf`, there is no `BaseContext` to intersect with, since a
 * `Command` carries no identity.
 *
 * @typeParam Shape - The command's blueprint shape.
 */
export type CommandContextOf<Shape extends CommandPropertiesShapeBase> = {
	[Key in CommandDomainKeys<Shape>]: Shape[Key]["prototype"];
};
