import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";

/**
 * The domain property keys of a `Command` blueprint — its string keys,
 * excluding the symbol slot a ruled blueprint carries its rules under.
 *
 * Mirrors the entity pillar's `DomainKeys`, duplicated locally: it is a
 * one-line filter with no entity-specific logic, and keeping it here avoids
 * reaching into `entity/types`, an internal file of a sibling pillar.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @see `Rules` in `@roastery/terroir/symbols` — the key filtered out.
 */
export type CommandDomainKeys<Shape extends CommandPropertiesShapeBase> =
	Extract<keyof Shape, string>;
