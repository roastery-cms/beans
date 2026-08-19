import { metaOf } from "@/domain/value-object/helpers";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";
import type { RedactionPlaceholder } from "./redaction-config";

/**
 * The redaction settings one blueprint key carries, as declared by its
 * value-object class.
 */
export interface ISensitiveKey {
	/** This class's own replacement, if it declared one. */
	readonly redactWith?: RedactionPlaceholder;
}

/**
 * Per-blueprint memo of the keys whose value-object declared itself sensitive.
 *
 * Memoized for the same reason the derived schema is: `defineMeta()` runs on a
 * fresh probe for every key inspected, so resolving this per serialization
 * would pay that cost on every `toString()` and every `Command.toJSON()`.
 * Keyed by the blueprint object, so every instance of a class shares one map.
 */
const cache = new WeakMap<object, ReadonlyMap<string, ISensitiveKey>>();

/**
 * Reads which of a blueprint's keys are backed by a value-object declaring
 * `sensitive: true`, and what each of them wants to be replaced with.
 *
 * Nested-entity properties are skipped: `metaOf` only knows how to read a
 * value-object, and an aggregate's own sensitive keys are handled when the
 * recursion reaches it.
 *
 * @param properties - The blueprint to inspect.
 * @returns Sensitive key → its declared redaction settings. Empty when none is.
 */
export function sensitiveKeysOf(
	properties: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, ISensitiveKey> {
	const cached = cache.get(properties);

	if (cached) return cached;

	const sensitive = new Map<string, ISensitiveKey>();

	for (const [key, propertyClass] of Object.entries(properties)) {
		// A nested entity has no `[Meta]` to read; its own properties are
		// resolved when serialization recurses into it.
		if (!isValueObjectClass(propertyClass)) continue;

		const meta = metaOf(propertyClass);

		if (meta.sensitive === true)
			sensitive.set(key, { redactWith: meta.redactWith });
	}

	cache.set(properties, sensitive);

	return sensitive;
}
