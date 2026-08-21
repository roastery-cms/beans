import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { RecordDefinition } from "../types/record-definition.type";
import type { RecordPropertiesShapeBase } from "../types/record-properties-shape-base.type";

/**
 * Reads the `RecordDefinition` the blueprint-bound factory (`recordOf`)
 * stamped onto its generated class as a static.
 *
 * `BoundRecord.defineRecord()` reads the static rather than closing over the
 * definition so that `defineRecord` stays a pure prototype method — which is
 * what lets `fromJSON` and `definitionOf` probe it through `Object.create`
 * without ever running a constructor.
 *
 * @typeParam PropertiesShape - The blueprint shape the definition carries.
 * @param instance - `this` inside the calling `defineRecord()`.
 * @returns The blueprint and record-type name bound at factory call time.
 *
 * @throws `InvalidEntityDefinitionException` — when the class was produced
 *   some other way and carries no definition.
 */
export function readBoundDefinition<
	PropertiesShape extends RecordPropertiesShapeBase,
>(instance: object): RecordDefinition<PropertiesShape> {
	const { definition } = instance.constructor as {
		definition?: RecordDefinition<PropertiesShape>;
	};

	if (!definition)
		throw new InvalidEntityDefinitionException(
			"record",
			"Record: this class descends from the blueprint-bound base but carries no definition. Build it with recordOf(properties, source), or extend DomainRecord directly and implement defineRecord.",
		);

	return definition;
}
