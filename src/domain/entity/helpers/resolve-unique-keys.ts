import { metaOf } from "@/domain/value-object/helpers";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";

/**
 * Per-blueprint memo of the keys whose value-object declared itself unique.
 *
 * Memoized for the same reason `sensitiveKeysOf`'s map is: `defineMeta()` runs
 * on a fresh probe for every key inspected, so resolving this per construction
 * would pay the whole scan on every `new`. Keyed by the blueprint object, so
 * every instance of a class shares one set.
 *
 * Only the value-object half is cached here — the definition-level list is
 * folded in afterwards, because two classes may share one blueprint and name
 * different extra keys.
 */
const cache = new WeakMap<object, ReadonlySet<string>>();

/**
 * The keys an entity declares as unique: `id` (always), the blueprint keys
 * whose value-object says `unique: true`, and the extra keys the entity's own
 * `defineEntity` named.
 *
 * **`id` is always in the result, for every entity, declared or not.** Identity
 * is the primary key — unique by construction — and an adapter walking these
 * keys to build indexes has to see it there, the same way a `CREATE TABLE`
 * emits `PRIMARY KEY` alongside its `UNIQUE` constraints. `createdAt` and
 * `updatedAt` are not: two rows may perfectly well be written in the same
 * millisecond.
 *
 * Seeding it *here* rather than in `entityOf` is what keeps the two entity
 * forms equivalent: the factory form and the hand-written `defineEntity` form
 * both reach this function, so neither needs a line of its own and neither can
 * drift from the other.
 *
 * Nested-entity properties are skipped in the scan — `metaOf` only knows how to
 * read a value-object — but a nested key *named* in `declared` is kept, and the
 * adapter then compares the whole serialized sub-object.
 *
 * The two sources answer different questions, exactly as their `sensitive`
 * counterparts do. `unique: true` on a `ValueObject` says *this kind of value
 * is always unique*; the definition's list says *this particular aggregate
 * treats this field as unique*, for when the type alone does not settle it.
 *
 * @param properties - The blueprint to inspect.
 * @param declared - Extra keys named by `defineEntity`.
 * @returns Every unique key, in blueprint order behind `id` — which makes it
 *   deterministic *which* key an adapter reports when two of them collide.
 *
 * @see `uniqueKeysOf` in `./unique-keys-of` — the public entry point, by class.
 */
export function resolveUniqueKeys(
	properties: Readonly<Record<string, unknown>>,
	declared?: readonly string[],
): ReadonlySet<string> {
	const fromValueObjects = readUniqueKeys(properties);

	// The common case allocates nothing: no definition-level list means the
	// memoized per-blueprint set is already the answer.
	if (declared === undefined || declared.length === 0) return fromValueObjects;

	return new Set([...fromValueObjects, ...declared]);
}

/**
 * The memoized half: `id` plus every blueprint key whose value-object declared
 * `unique: true`.
 *
 * @param properties - The blueprint to inspect.
 * @returns The cached set for this blueprint, computing it on first ask.
 */
function readUniqueKeys(
	properties: Readonly<Record<string, unknown>>,
): ReadonlySet<string> {
	const cached = cache.get(properties);

	if (cached) return cached;

	// `id` first, so it leads the iteration order every consumer sees.
	const unique = new Set<string>(["id"]);

	for (const [key, propertyClass] of Object.entries(properties)) {
		// A nested entity has no `[Meta]` to read. Naming one in the definition's
		// own list still works — that path does not go through `metaOf`.
		if (!isValueObjectClass(propertyClass)) continue;

		if (metaOf(propertyClass).unique === true) unique.add(key);
	}

	cache.set(properties, unique);

	return unique;
}
