import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { CommandDefinition } from "../types/command-definition.type";
import type { CommandPropertiesShapeBase } from "../types/command-properties-shape-base.type";

/**
 * Invokes an object's `defineCommand`, guarding against the class-field
 * trap.
 *
 * The base calls `this.defineCommand()` **inside** its constructor, because
 * it needs the blueprint to build the instance. A class field's initializer
 * only runs after `super()` returns, so a `protected defineCommand = () =>
 * …` would arrive too late and construction would die with a bare
 * `TypeError`. TypeScript cannot reject that (a property may override a
 * method), so the guard is a runtime one — the same trap `Entity` and
 * `ValueObject` guard against for their own `defineX()`.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @param command - The instance (or probe) expected to implement `defineCommand`.
 * @returns The subclass's definition: blueprint and command-type name.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineCommand` is not a
 *   prototype method.
 */
export function readDefinition<Shape extends CommandPropertiesShapeBase>(
	command: object,
): CommandDefinition<Shape> {
	const define = (command as { defineCommand?: () => CommandDefinition<Shape> })
		.defineCommand;

	if (typeof define !== "function")
		throw new InvalidEntityDefinitionException(
			"command",
			"Command: defineCommand must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.",
		);

	return define.call(command);
}
