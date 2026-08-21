/**
 * @module
 *
 * The three multiplicity wrappers: `arrayOf`, `optionalOf` and `nullableOf`,
 * each taking one blueprint class — a value-object, an entity or a record —
 * and returning another blueprint class that changes only how many of it a key
 * holds.
 *
 * `defineWrapper` (the core the three lower into), `buildItem` and
 * `wrapperModelFor` stay off this barrel: they are the pillar's internals, and
 * a consumer reaching for them would be building a fourth multiplicity the
 * type layer knows nothing about.
 */

export { arrayOf } from "./array-of";
export { nullableOf } from "./nullable-of";
export { optionalOf } from "./optional-of";
