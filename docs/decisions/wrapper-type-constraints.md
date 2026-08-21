# Multiplicity wrappers: why the type-level constraints are shaped the way they are

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`domain/wrapper/` is the multiplicity pillar: `arrayOf`, `optionalOf` and `nullableOf`
(`wrapper/helpers/`), each taking one blueprint class — a `ValueObject`, an `Entity` or a
`DomainRecord` — and returning another blueprint class that changes only *how many* of it a
key holds. `defineWrapper` is the core the three lower into (mirroring `defineValueObject`),
`buildItem` constructs one item by the inner class's own kind, and `wrapperModelFor` derives
the schema.

## Why the pillar was cheap to add

**Almost no runtime discriminates the three singular kinds, only value-object versus not.** So
a generated wrapper — structurally a container carrying
`toJSON`/`toSafeJSON`/`schema`/`pullDomainEvents`, constructed from one payload argument, with
a no-argument `demo()` — crosses `buildProperty`, `rawOf`, `toSafeJSON`, `setMany`'s change
detection and the deep drain with **zero** changes.

Exactly two runtime points needed a branch:

- `get` (unwraps, tested *before* `isValueObject`, since a wrapper is a container);
- each pillar's `modelFor` (derives `t.Array`/`t.Union`; the `optional` form deliberately falls
  through the existing `acceptsUndefined` line so the key drops out of `required` on its own).

`wrapper/helpers/model-for.ts` **must stay class-free** — it forms the same mutual cycle with
the entity and record `modelFor`s that those two already form with each other, safe for the
identical reason.

## The type side is disjoint on the class, not the instance

A wrapper instance is structurally identical to a record one (`unwrap` is a method a record may
declare), so `AnyEntityClass` and `AnyRecordClass` gained `readonly wraps?: never` — a
**static**, which a blueprint key can never shadow, unlike the instance-side `?: never` idiom
`AnyRecord` uses.

Two type-level constraints are load-bearing and were both **measured**, not guessed:

- `WrappableClass` (`domain/entity/types`) stops the wrapped union one level short of
  `AnyPropertyClass`, because typing `wraps` as the full union makes the two mutually recursive
  and TS2589s on a real blueprint — which is also the type-level statement of the contract that
  **a wrapper does not wrap a wrapper**.
- Every blueprint conditional probes the two statics inline
  (`Class extends { readonly wrapperKind: infer Kind extends WrapperKind; readonly wraps: infer Inner extends WrappableClass }`)
  rather than testing `extends AnyWrapperClass`, because the full structural form drags
  `AnyWrapper`'s five members into the comparison at every key of every blueprint and TS2589s
  there too.

`AnyWrapperClass` stays the vocabulary — what `isWrapperClass` narrows to, what
`wrapperModelFor` takes, what `AnyPropertyClass` unions in.

## Consequences elsewhere

- `RepositoryFilterKeysOf` excludes a wrapped key (a list is not a predicate);
  `testing/helpers/filter-keys-of.ts` needed **no change**, its positive `isValueObjectClass`
  test being exactly what a fourth kind was meant to prove.
- `UndefinedableKeys` reads the `wrapperKind` static for `optionalOf` — never re-entering
  `InputValueOf`, preserving the documented reason that type avoids the nested branches.
- `isWrapperClass`/`isWrapper` are the **only** discriminant pair probing a *static*
  (`wrapperKind`) rather than a prototype method, and deliberately: that static is also what the
  type level reads, so probing anything else would create a second source for one question.
- An item's exception reports the wrapper's `source` (`"array-of"`, `"optional-of"`,
  `"nullable-of"`) and the item's index or `"value"` as its name, not the owning blueprint's key
  — the same trade a nested entity already makes.
- `arrayOf(EmailVO)` and `customArrayVO(EmailSchema)` coexist: the first wraps a *class*
  (inheriting its `transform`/`validate`/`sensitive`), the second a *schema*. Neither is
  deprecated.
