import { redactedValue } from "./redaction-config";
import type { ISensitiveKey } from "./sensitive-keys-of";

/**
 * Replaces one serialized value when its key was marked sensitive, and hands
 * it back untouched otherwise.
 *
 * @param sensitive - The class's resolved sensitive keys.
 * @param key - The key being serialized.
 * @param source - The entity- or command-type name, passed to a placeholder
 *   function as part of the field's context.
 * @param value - The real serialized value.
 * @returns The replacement, or `value` when the key is not sensitive.
 */
export function redactIfSensitive(
	sensitive: ReadonlyMap<string, ISensitiveKey>,
	key: string,
	source: string,
	value: unknown,
): unknown {
	const rule = sensitive.get(key);

	return rule === undefined
		? value
		: redactedValue(value, { name: key, source }, rule.redactWith);
}
