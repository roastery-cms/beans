import type { BoundCommand } from "@/application/command/command";
import type { Properties } from "@roastery/terroir/symbols";
import type { CommandAccessorsOf } from "./command-accessors-of.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { RawCommandContextOf } from "./raw-command-context-of.type";
import type { SerializedCommand } from "./serialized-command.type";

/**
 * The **class** `commandOf` returns — not an instance. `EntityClassOf`'s
 * counterpart, and load-bearing for the same TS4060 reason.
 *
 * The construct signature is `abstract new`, unlike `EntityClassOf`'s: a
 * `Command` still owes an `execute()`, so the returned base is genuinely
 * abstract and only the subclass that implements it becomes constructible.
 * That forces the shape to be an **intersection** rather than a single object
 * type — `abstract` is not a legal modifier on an object type's construct
 * member (TS1070), only on a standalone constructor type.
 *
 * @typeParam Shape - The blueprint shape the factory was given.
 * @typeParam Deps - The dependencies `execute()` takes.
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @see `commandOf` in `@/application/command/helpers/command-of` — the factory returning this shape.
 */
export type CommandClassOf<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result,
> = (abstract new (
	payload: RawCommandContextOf<Shape>,
) => BoundCommand<Shape, Deps, Result> & CommandAccessorsOf<Shape>) & {
	/** Instance side: the base plus the blueprint-derived accessors, already typed. */
	readonly prototype: BoundCommand<Shape, Deps, Result> &
		CommandAccessorsOf<Shape>;

	/**
	 * Inherited from the base: builds the command from its declared defaults.
	 *
	 * @returns An instance of the subclass the call was made on.
	 */
	demo<
		Self extends {
			readonly prototype: { [Properties]: CommandPropertiesShapeBase };
		},
	>(this: Self): Self["prototype"];

	/**
	 * Inherited from the base: strict hydration from an untrusted payload.
	 *
	 * @param data - The serialized command payload.
	 * @returns An instance of the subclass the call was made on.
	 */
	fromJSON<
		Self extends {
			readonly prototype: { [Properties]: CommandPropertiesShapeBase };
		},
	>(this: Self, data: SerializedCommand<Shape>): Self["prototype"];
};
