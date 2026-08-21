# Sensitive values suppress the repository port (and only from the value-object source)

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

Two sources declare *which* keys are sensitive — `sensitive: true` on a value-object's
`defineMeta` (travels with the type) and `sensitive: [...]` on `defineEntity`/`defineCommand`
(this aggregate only) — and **only the first of the two suppresses repository methods**,
which is the one place they are not interchangeable.

`sensitive: true` on a VO makes `RepositoryOf` omit that key's `findBy`/`findManyBy`, while
the per-aggregate list does not, because `entityOf` takes its extra definition without a
`const` type parameter and the hand-written `defineEntity` form loses the literal at its
return annotation — suppressing on one and not the other would split two forms that are
deliberately kept equivalent. Both still redact, and both still answer
`Entity#isSensitive(key)`.

The value-object source is read at the type level through `IsSensitiveValueObjectClass`
(`domain/value-object/types/is-sensitive-value-object-class.type.ts`, off-barrel, imported by
direct path), which is only expressible because `IValueObjectMetadata` carries `sensitive` as
a **type parameter** rather than a plain `boolean`.

## Both doors are closed

The suppression is closed on **both** doors:

1. `RepositoryFilterKeysOf` stops the generator deriving the name.
2. `Extras` is constrained by `RepositorySuppressedNamesOf<EntityClass>`
   (`{ [Name in …]?: never }`) so a hand-written extra — or an `inMemoryRepositoryOf`
   handler — cannot put it back.

Without that second half the rule would be a naming convention rather than a guarantee.

`RepositorySuppressedNamesOf` lists **all four** derived names for a sensitive key, not just
the two `find*` ones: `existsByPassword` is if anything the worse leak, handing out the
secret one bit at a time.

One insertion point covers all four halves: `RepositoryCollectionFilterKeysOf` is
`Exclude<RepositoryFilterKeysOf<P>, "id">`, so `findByX`/`existsByX` (full set) and
`findManyByX`/`countByX` (collection set) disappear together, and the
`[Selected] extends [never]` guard is never at risk — `count`/`findMany`/`findManyByIds`/
`findById` plus the three writes survive even a blueprint whose every key is sensitive.

## Runtime alignment

The runtime alignment falls out for free and needed no signature change: `sensitiveKeysOf`
reads **only** the value-object source, which is exactly what the type sees, so
`testing/helpers/filter-keys-of.ts` calls it; `resolveSensitiveKeys` merges both, so
redaction and `isSensitive` call that one instead.
