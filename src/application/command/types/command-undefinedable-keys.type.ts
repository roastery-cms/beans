import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";

/**
 * The blueprint keys whose value-object class accepts `undefined` as an
 * input value — built with `optionalVO`, or any custom value-object whose
 * `ValueType` includes `undefined`. `never` when no property does.
 *
 * These are the keys a construction payload may **omit**, on top of the ones
 * a rule already covers — the same relaxation the entity pillar's
 * `UndefinedableKeys` grants, duplicated here since a `Command` blueprint has
 * no nested-entity branch to guard against in the first place: every key is
 * a value-object, so reading `["prototype"]["value"]` directly is always
 * safe, never a risk of a circular mapped type.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @see `RawCommandContextOf` in `./raw-command-context-of.type` — where these
 *   keys become optional alongside `CommandRuledKeys`.
 */
export type CommandUndefinedableKeys<Shape extends CommandPropertiesShapeBase> =
	{
		[Key in CommandDomainKeys<Shape>]: Shape[Key] extends AnyValueObjectClass
			? undefined extends Shape[Key]["prototype"]["value"]
				? Key
				: never
			: never;
	}[CommandDomainKeys<Shape>];
