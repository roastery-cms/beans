import { CyclicEntityDefinitionException } from "@roastery/terroir/exceptions/domain";

/**
 * Builds the exception both cycle guards throw, so a blueprint cycle surfaces
 * as a diagnosable error naming the entity instead of a bare `RangeError`.
 *
 * @param source - Entity-type name of the blueprint that closed the cycle.
 * @returns The exception to throw.
 */
export function cycleError(source: string): CyclicEntityDefinitionException {
	return new CyclicEntityDefinitionException(
		source,
		`Entity: the blueprint of "${source}" references itself, directly or indirectly. There is no cycle handling beyond this detection — break the cycle before modeling.`,
	);
}
