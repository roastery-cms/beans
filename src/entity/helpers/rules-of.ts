import { Rules } from "@roastery/terroir/symbols";
import type { PropertiesShapeBase } from "../types";
import type { RulesOf } from "../types/rules-of.type";

/**
 * Reads the domain rules a blueprint carries, if any.
 *
 * A plain blueprint has no rule slot, and gets the empty map — which is what
 * makes every ruled code path collapse into the original behaviour without a
 * branch at each call site.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @param properties - The blueprint to read, ruled or plain.
 * @returns The declared rules, or an empty map.
 *
 * @see `blueprint` in `./blueprint` — writes the slot this reads.
 */
export function rulesOf<PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
): RulesOf<PropertiesShape> {
	return (
		(properties as { [Rules]?: RulesOf<PropertiesShape> })[Rules] ??
		({} as RulesOf<PropertiesShape>)
	);
}
