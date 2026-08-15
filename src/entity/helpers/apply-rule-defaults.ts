import type { AnyPropertyRule } from "../types/any-property-rule.type";

/**
 * Fills the entity-level defaults over a construction payload: every rule that
 * declares a `default` writes it, but only where the payload left the property
 * out. An explicit value always wins — including an explicit `false`, since
 * the check is against `undefined` rather than falsiness.
 *
 * Runs before any derivation, so a `derive` sees the defaults already applied.
 *
 * @param rules - The blueprint's declared rules.
 * @param raw - The construction payload (empty in demo mode).
 * @returns A new payload with the defaults filled in.
 *
 * @see `PropertyRule` in `../types/property-rule.type` — the `default` half of
 *   the union this reads.
 */
export function applyRuleDefaults(
	rules: Readonly<Record<string, AnyPropertyRule | undefined>>,
	raw: Record<string, unknown>,
): Record<string, unknown> {
	const values: Record<string, unknown> = { ...raw };

	for (const [key, rule] of Object.entries(rules)) {
		if (values[key] !== undefined) continue;

		if (rule?.default !== undefined) values[key] = rule.default;
	}

	return values;
}
