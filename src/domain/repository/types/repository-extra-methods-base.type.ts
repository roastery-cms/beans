/**
 * Base constraint of {@link RepositoryOf}'s `Extras` argument: any object type
 * carrying the methods a port needs beyond what the blueprint can generate.
 *
 * Deliberately as wide as `object`, not `Record<string, unknown>`. An
 * `interface` — the natural way to declare a handful of extra methods — has no
 * implicit index signature and would fail a `Record` bound outright, while a
 * `type` alias of the very same members would pass. A constraint that accepts
 * one and rejects the other for a reason unrelated to the domain is a
 * constraint that only teaches the wrong lesson.
 *
 * The trade is that `beans` cannot check anything about the extras: they are
 * intersected in as written, names and signatures both. That is the intended
 * split — the generated half is proven against the blueprint, the extra half
 * is the developer's own word.
 *
 * @see {@link RepositoryOf} — the only consumer.
 */
export type RepositoryExtraMethodsBase = object;
