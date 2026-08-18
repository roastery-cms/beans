import type { Rules } from "@roastery/terroir/symbols";

/**
 * The keys a ruled `Command` blueprint declared a rule for, read off the
 * `[Rules]` symbol slot a `RuledBlueprint` carries. `never` for a plain
 * blueprint, which is what collapses every ruled code path back to the
 * original behaviour.
 *
 * A one-line copy of the entity pillar's own `RuledKeys` — it only inspects
 * the shared `[Rules]` slot and carries no entity-specific logic, so
 * reaching into `entity/types` for it would buy nothing but coupling.
 *
 * @typeParam Blueprint - The (possibly ruled) blueprint to inspect.
 */
export type CommandRuledKeys<Blueprint> = Blueprint extends {
	readonly [Rules]: infer Rule;
}
	? Extract<keyof Rule, string>
	: never;
