import { CyclicEntityDefinitionException } from "@roastery/terroir/exceptions/domain";

/**
 * Builds the exception every pillar's cycle guards throw, so a blueprint cycle
 * surfaces as a diagnosable error naming the type instead of a bare
 * `RangeError`.
 *
 * Shared rather than duplicated per pillar for the same reason
 * `installAccessors` is: the logic is identical everywhere and only the word
 * quoted in the message changes, so two copies would only guarantee that a fix
 * to one silently misses the other.
 *
 * `CyclicEntityDefinitionException` stays the class thrown from every pillar —
 * the "entity" in its name is terroir's vocabulary for a blueprint-driven
 * type, not a claim about which of the three declared the cycle.
 *
 * @param source - Type name of the blueprint that closed the cycle.
 * @param label - Which pillar detected it, for the message.
 * @returns The exception to throw.
 *
 * @example
 * ```ts
 * if (deriving.has(properties)) throw cycleError(source, "Entity");
 * ```
 */
export function cycleError(
	source: string,
	label: "Command" | "Entity" | "Record",
): CyclicEntityDefinitionException {
	return new CyclicEntityDefinitionException(
		source,
		`${label}: the blueprint of "${source}" references itself, directly or indirectly. There is no cycle handling beyond this detection — break the cycle before modeling.`,
	);
}
