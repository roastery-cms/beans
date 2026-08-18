import type { t } from "@roastery/terroir";
import { SchemaManager } from "@roastery/terroir/schema";

/**
 * Whether a property's schema accepts `undefined` as a value — true for every
 * `optionalVO`-built class (whose schema is `t.Union([…, t.Undefined()])`),
 * false for a `nullableVO` one (`null` is not `undefined`, so a nullable key
 * stays required) and for every ordinary value-object.
 *
 * Asks the schema itself rather than testing for the union shape: structural
 * discrimination, the same preference `isEntityClass`/`SchemaOf` already
 * follow, so a hand-rolled schema that happens to accept `undefined` is
 * treated like one `optionalVO` produced. Only ever called from
 * {@link modelFor}, which memoizes per blueprint, so the extra check costs
 * one `Value.Check` per property per class — not per construction.
 *
 * @param schema - The property's own TypeBox schema.
 * @returns `true` when `undefined` passes the schema.
 *
 * @see `UndefinedableKeys` in `./types/undefinedable-keys.type` — the
 *   type-level counterpart, deciding the same thing about the same keys.
 */
export function acceptsUndefined(schema: t.TSchema): boolean {
	return SchemaManager.match(schema, undefined);
}
