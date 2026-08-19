import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { CommandDefinition } from "@/application/command/types/command-definition.type";
import type { CommandPropertiesShapeBase } from "@/application/command/types/command-properties-shape-base.type";

/**
 * Reads the `CommandDefinition` a blueprint-bound factory (`commandOf`,
 * `aggregateCommandOf`) stamped onto its generated class as a static.
 *
 * Shared by every `Bound*Command` base's `defineCommand()` — `BoundCommand`
 * and `BoundAggregateCommand` implement the exact same "read the static my
 * factory stamped on `this.constructor`, or explain how to fix it" logic,
 * differing only in which factory name the guard's message suggests. Kept
 * as one function instead of two copies for the same reason `installAccessors`
 * moved to `@/shared/helpers`: two identical bodies only guarantee a fix to
 * one silently misses the other.
 *
 * @typeParam Shape - The blueprint shape the definition carries.
 * @param instance - `this` inside the calling `defineCommand()`.
 * @param factoryHint - The factory name to suggest in the thrown message
 *   (e.g. `"commandOf"`, `"aggregateCommandOf"`).
 * @returns The blueprint and command-type name bound at factory call time.
 *
 * @throws `InvalidEntityDefinitionException` — when the class was produced
 *   some other way and carries no definition.
 */
export function readBoundDefinition<Shape extends CommandPropertiesShapeBase>(
	instance: object,
	factoryHint: string,
): CommandDefinition<Shape> {
	const { definition } = instance.constructor as {
		definition?: CommandDefinition<Shape>;
	};

	if (!definition)
		throw new InvalidEntityDefinitionException(
			"command",
			`Command: this class descends from a blueprint-bound base but carries no definition. Build it with ${factoryHint}(properties, source), or extend the base class directly and implement defineCommand.`,
		);

	return definition;
}
