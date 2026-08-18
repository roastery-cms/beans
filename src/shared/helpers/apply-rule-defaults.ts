/**
 * Fills the blueprint-level defaults over a construction payload: every rule
 * that declares a `default` writes it, but only where the payload left the
 * property out.
 *
 * **"Omitted" means `undefined`, not falsy.** The check is against
 * `undefined` rather than falsiness, so an explicit `false`, `0` or `""`
 * counts as a supplied value and the rule does not fire — which is exactly
 * what a `{ hidden: { default: false } }` rule needs in order to stay
 * overridable with `true`.
 *
 * Runs before any derivation, so a `derive` sees the defaults already
 * applied. Never mutates the payload it is given.
 *
 * Shared by both pillars: the resolution carries nothing entity- or
 * command-specific, and the rule only has to expose its `default`.
 *
 * @param rules - The blueprint's rule map.
 * @param raw - The raw construction payload.
 * @returns A copy of the payload with the defaults filled in.
 */
export function applyRuleDefaults(
	rules: Readonly<Record<string, { readonly default?: unknown } | undefined>>,
	raw: Record<string, unknown>,
): Record<string, unknown> {
	const values: Record<string, unknown> = { ...raw };

	for (const [key, rule] of Object.entries(rules)) {
		if (values[key] !== undefined) continue;

		if (rule?.default !== undefined) values[key] = rule.default;
	}

	return values;
}
