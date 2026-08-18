import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandRawValueOf } from "./command-raw-value-of.type";
import type { CommandUndefinedableKeys } from "./command-undefinedable-keys.type";

/**
 * The full serialized form of a `Command`: one raw value per blueprint
 * property, with no identity fields. This is what `toJSON()` returns and
 * what the static `fromJSON` validates and accepts.
 *
 * Every key is required **except** the ones whose value-object accepts
 * `undefined` ({@link CommandUndefinedableKeys}), which are optional:
 * `toJSON()` emits them as present-with-`undefined` and `JSON.stringify`
 * then drops them, so an HTTP body that simply omitted an optional field is
 * a valid payload. `modelFor` relaxes exactly the same keys at the schema
 * level, so the type and the 400 that `fromJSON` raises agree on what
 * "missing" means.
 *
 * Ruled keys stay required — a rule acts on construction input only, never
 * on serialization.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @see `RawCommandContextOf` in `./raw-command-context-of.type` — the input
 *   counterpart, which relaxes ruled keys as well; this mirrors its
 *   `Exclude`/`Extract` split, minus the ruled half.
 */
export type SerializedCommand<Shape extends CommandPropertiesShapeBase> = {
	[Key in Exclude<
		CommandDomainKeys<Shape>,
		CommandUndefinedableKeys<Shape>
	>]: CommandRawValueOf<Shape[Key]>;
} & {
	[Key in Extract<
		CommandDomainKeys<Shape>,
		CommandUndefinedableKeys<Shape>
	>]?: CommandRawValueOf<Shape[Key]>;
};
