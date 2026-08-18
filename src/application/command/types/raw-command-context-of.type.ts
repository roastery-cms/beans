import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandRawValueOf } from "./command-raw-value-of.type";
import type { CommandRuledKeys } from "./command-ruled-keys.type";
import type { CommandUndefinedableKeys } from "./command-undefinedable-keys.type";

/**
 * The constructor payload of a `Command` subclass: every blueprint
 * property's raw input value. Unlike the entity pillar's `RawContextOf`,
 * there is no identity to intersect with — a `Command` has no `id`,
 * `createdAt` or `updatedAt`, so this alone is the payload type.
 *
 * Properties that declared a rule in the blueprint, or whose value-object
 * accepts `undefined` (`optionalVO`-backed), are **optional** here — the
 * base fills the former from `default`/`derive`, and the latter already
 * treats a missing key the same as an explicit `undefined`. On a plain
 * blueprint every property stays required.
 *
 * @typeParam Shape - The command's blueprint shape.
 */
export type RawCommandContextOf<Shape extends CommandPropertiesShapeBase> = {
	[Key in Exclude<
		CommandDomainKeys<Shape>,
		CommandRuledKeys<Shape> | CommandUndefinedableKeys<Shape>
	>]: CommandRawValueOf<Shape[Key]>;
} & {
	[Key in Extract<
		CommandDomainKeys<Shape>,
		CommandRuledKeys<Shape> | CommandUndefinedableKeys<Shape>
	>]?: CommandRawValueOf<Shape[Key]>;
};
