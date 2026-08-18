import type { Rules } from "@roastery/terroir/symbols";

/**
 * The blueprint keys that declared a rule — the keys the construction payload
 * may omit. `never` for a plain blueprint, which is what collapses the ruled
 * machinery back into the original behaviour when no rules exist.
 *
 * @typeParam Blueprint - The blueprint, ruled or plain.
 *
 * @see `ConstructionValuesOf` in `./construction-values-of.type` — where these
 *   keys become optional.
 */
export type RuledKeys<Blueprint> = Blueprint extends {
	readonly [Rules]: infer Rule;
}
	? Extract<keyof Rule, string>
	: never;
