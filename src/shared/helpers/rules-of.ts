import { Rules } from "@roastery/terroir/symbols";

/**
 * Reads the domain rules a blueprint carries, if any.
 *
 * The rules live under the `Rules` symbol key **on the blueprint object
 * itself** (written by `blueprint(shape).with(rules)`), which is what keeps
 * the feature cheap: `Object.keys`/`Object.entries` skip symbols, so every
 * traversal that walks a blueprint — schema derivation, accessor install,
 * serialization — keeps seeing exactly the domain properties and nothing else.
 *
 * Falls back to an empty map so callers never have to branch on absence. The
 * rule map's own shape is the caller's to name (`RuleMap`): reading a symbol
 * slot is untyped by nature, and both pillars narrow the result to their own
 * rule type at the call site anyway.
 *
 * Note the **value** import of `Rules` above. The symbol is used here as a
 * computed key, read at runtime — `import type` would be erased by
 * `verbatimModuleSyntax` and this would throw `ReferenceError: Rules is not
 * defined` from inside every construction, while the module graph still
 * loaded fine. Files that only mention `Rules` inside a type correctly use
 * `import type`.
 *
 * @typeParam RuleMap - The rule map the caller expects the blueprint to carry.
 *
 * @param properties - The blueprint to read from.
 * @returns The declared rules, or an empty map.
 *
 * @see `blueprint` in `@/domain/entity/helpers/blueprint` — writes the slot this reads.
 */
export function rulesOf<RuleMap>(properties: object): RuleMap {
	return (properties as { [Rules]?: RuleMap })[Rules] ?? ({} as RuleMap);
}
