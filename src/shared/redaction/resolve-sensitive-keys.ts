import { type ISensitiveKey, sensitiveKeysOf } from "./sensitive-keys-of";

/**
 * Merges the two sources a class draws its sensitive keys from: the
 * value-objects that declared themselves sensitive, and the extra keys the
 * class's own definition named.
 *
 * The two exist because they answer different questions. `sensitive: true` on
 * a `ValueObject` says *this kind of value is always secret* — a `PasswordVO`
 * is one wherever it appears. The definition's list says *this particular
 * aggregate treats this field as secret*, for the case where the type alone
 * does not settle it: a `StringVO` holding an API token, say.
 *
 * The value-object's own `redactWith` wins where both name the same key — the
 * class knows better than the aggregate how its value should be masked.
 *
 * @param properties - The blueprint.
 * @param declared - Extra keys named by `defineEntity`/`defineCommand`.
 * @returns Sensitive key → its redaction settings.
 */
export function resolveSensitiveKeys(
	properties: Readonly<Record<string, unknown>>,
	declared?: readonly string[],
): ReadonlyMap<string, ISensitiveKey> {
	const fromValueObjects = sensitiveKeysOf(properties);

	// The common case allocates nothing: no definition-level list means the
	// memoized per-blueprint map is already the answer.
	if (declared === undefined || declared.length === 0) return fromValueObjects;

	const merged = new Map(fromValueObjects);

	for (const key of declared) if (!merged.has(key)) merged.set(key, {});

	return merged;
}
