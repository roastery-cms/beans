import type { Context, Properties, Source } from "@roastery/terroir/symbols";
import type { CommandContextOf } from "./command-context-of.type";
import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandReadValueOf } from "./command-read-value-of.type";
import type { CommandResult } from "./command-result.type";
import type { CommandSchemaOf } from "./command-schema-of.type";
import type { SerializedCommand } from "./serialized-command.type";

/**
 * Behavioural contract of every application-layer command. Implemented by
 * the `Command` abstract class; useful on its own to type code that
 * consumes commands without naming a concrete subclass.
 *
 * The three symbol-keyed members mirror the slots the base class fills
 * during construction: the command-type name under `[Source]`, the
 * blueprint under `[Properties]` and the built property map under
 * `[Context]` — the same slots `IEntity` exposes, minus identity and
 * mutation, since a `Command` has neither.
 *
 * @typeParam Shape - The command's blueprint shape. Defaults to
 *   {@link CommandPropertiesShapeBase} so the interface can be used
 *   unparameterised.
 * @typeParam Deps - The dependencies `execute()` takes.
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @see {@link CommandResult} — what `execute()` resolves to.
 * @see {@link SerializedCommand} — what `toJSON()` returns.
 */
export interface ICommand<
	Shape extends CommandPropertiesShapeBase = CommandPropertiesShapeBase,
	Deps = unknown,
	Result = unknown,
> {
	/** Stable command-type identifier (e.g. `"create-user"`), from `defineCommand()`. */
	readonly [Source]: string;

	/** The blueprint: one `ValueObject` class per input field. */
	readonly [Properties]: Shape;

	/** The built property map: one value-object instance per blueprint key. */
	readonly [Context]: CommandContextOf<Shape>;

	/** Aggregate TypeBox schema, derived from the blueprint. */
	get schema(): CommandSchemaOf<Shape>;

	/** Serializes to a plain object: one raw value per property. */
	toJSON(): SerializedCommand<Shape>;

	/** Reads one blueprint key's raw value. */
	get<Key extends CommandDomainKeys<Shape>>(
		key: Key,
	): CommandReadValueOf<Shape, Key>;

	/** Orchestrates the command's behaviour, resolving to its result and any domain events raised along the way. */
	execute(deps: Deps): Promise<CommandResult<Result>>;
}
