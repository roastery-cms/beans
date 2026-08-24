import type { t } from "@roastery/terroir";
import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandPropertySchemaOf } from "./command-property-schema-of.type";

/**
 * The aggregate TypeBox object schema of a `Command`: one schema per
 * blueprint property, with no identity fields to add — the entity pillar's
 * `EntitySchemaOf` intersects those in, a `Command` has none. This is the
 * type of `command.schema`, derived from the blueprint — never written by
 * hand.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @see {@link CommandPropertySchemaOf} — the per-property rule, which covers
 *   the record and wrapper keys a command blueprint may hold.
 */
export type CommandSchemaOf<Shape extends CommandPropertiesShapeBase> =
	t.TObject<{
		[Key in CommandDomainKeys<Shape>]: CommandPropertySchemaOf<Shape[Key]>;
	}>;
