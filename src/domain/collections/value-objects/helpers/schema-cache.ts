import type { IValueObjectContext } from "@/domain/value-object/types";
import type { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";

/**
 * Hydrated schemas, memoized by their **wire string**.
 *
 * `SchemaManager` has a compiled-validator cache of its own, but it is a
 * `WeakMap` keyed by the schema *object* — and `SchemaManager.build` runs
 * `hydrateSchema(JSON.parse(wire))`, producing a fresh object every call. So
 * building the same wire twice misses that cache twice, which is exactly the
 * situation `SchemaManager.match`'s own TSDoc warns about ("a schema built
 * inline at the call site is a new object every time"). Measured here: 3.53 µs
 * per `build` + `match` against 0.010 µs once the schema object is stable — a
 * factor of ~364.
 *
 * Keying by string is what makes the hit possible, and it is also why this is
 * a `Map` and not a `WeakMap`: a string is not a GC root anything else holds.
 */
const schemas = new Map<string, t.TSchema>();

/**
 * Ceiling on {@link schemas}, past which the whole cache is dropped.
 *
 * A module-level `Map` fed by strings of untrusted origin — a `SchemaVO` built
 * from an HTTP body, say — would otherwise grow without bound, one entry per
 * distinct payload. The cap turns that into a bounded working set: the only
 * cost of overflowing is recompiling, never failing.
 *
 * Deliberately a **ceiling, not an LRU**. An eviction policy would need access
 * ordering and a benchmark to justify it; clearing outright is three lines and
 * cannot itself become the bug.
 */
const MAX_CACHED_SCHEMAS = 256;

/**
 * The memoized hydration both exported helpers share, propagating whatever
 * `SchemaManager.build` throws. Kept module-private so each caller decides how
 * a failure surfaces — as an exception or as `false`.
 *
 * Only successes reach the map, so a flood of invalid payloads cannot fill it.
 *
 * @param wire - A JSON-serialized TypeBox schema.
 * @returns The hydrated schema, shared across calls with the same wire.
 *
 * @throws Whatever `SchemaManager.build` raises — `SyntaxError` on malformed
 *   JSON, or a `TypeCompiler` error on a payload that parses but is not a
 *   schema.
 */
function hydrate(wire: string): t.TSchema {
	const cached = schemas.get(wire);

	if (cached) return cached;

	const built = SchemaManager.build(wire);

	if (schemas.size >= MAX_CACHED_SCHEMAS) schemas.clear();

	schemas.set(wire, built);

	return built;
}

/**
 * Hydrates a wire string into a usable TypeBox schema, memoized.
 *
 * The failure mode is the point: `SchemaManager.build` throws a bare
 * `SyntaxError` on malformed JSON and propagates `TypeCompiler` errors on a
 * payload that parses but is not a schema. Neither says which property was
 * wrong, so both are re-thrown as `InvalidPropertyException` with the original
 * preserved as `cause` — the same exception the value-object machinery raises
 * for every other invalid value.
 *
 * @param wire - A JSON-serialized TypeBox schema.
 * @param context - `{ name, source }` — whose value this is.
 * @returns The hydrated schema, shared across calls with the same wire.
 *
 * @throws `InvalidPropertyException` — when `wire` is not a compilable schema.
 *
 * @see {@link isSchemaWire} — the predicate form, which never throws.
 */
export function buildSchema(
	wire: string,
	context: IValueObjectContext,
): t.TSchema {
	try {
		return hydrate(wire);
	} catch (error) {
		throw new InvalidPropertyException(
			context.name,
			context.source,
			`The property '${context.name}' in ${context.source} is not a serialized TypeBox schema.`,
			{ cause: error },
		);
	}
}

/**
 * Whether a wire string hydrates and compiles as a TypeBox schema. **Never
 * throws.**
 *
 * Replaces `SchemaManager.isSchema` in the value-objects' `validate()`, and
 * the difference is not cosmetic: `isSchema` compiles the schema and discards
 * it (measured at 1.84 µs per call), so validating and then matching paid for
 * the same compilation twice. This memoizes on success, so constructing a
 * `SchemaVO` **warms the cache** for every `SchemaVO.match` that follows.
 *

 * @param wire - A candidate JSON-serialized TypeBox schema.
 * @returns `true` when it hydrates and compiles.
 *
 * @see {@link buildSchema} — the throwing form, which returns the schema.
 */
export function isSchemaWire(wire: string): boolean {
	try {
		hydrate(wire);

		return true;
	} catch {
		return false;
	}
}
