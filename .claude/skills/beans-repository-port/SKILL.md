---
name: beans-repository-port
description: Use when creating or changing anything under `src/domain/repository/`, when deriving or renaming port methods (`findBy*`, `findManyBy*`, `countBy*`, `existsBy*`, `findManyByIds`, `paginate`), when touching `RepositoryOf` / `ICan*` / `RepositoryFilterKeysOf` / `RepositoryCollectionFilterKeysOf` / `RepositoryOrderKeysOf` / `RepositoryPageOf` / `RepositorySuppressedNamesOf`, when a blueprint key must stop generating a lookup (sensitive, nested, wrapped), or when declaring an entity's persistence contract in a consumer.
---

# The repository pillar

`domain/repository/` is `repository/types/` only: `RepositoryOf` (the port generator) plus the
nine `ICan*` capability contracts it fuses. **Type-only, emitting no runtime at all**, and with
**no `index.ts` at the pillar root** — `@roastery/beans/domain/repository/types` is the canonical
subpath. `tsup` emits an empty `index.js` next to the `.d.ts`, which is correct.

## Inviolable rules

1. **`RepositoryOf` must keep its `[Selected] extends [never] ? never` guard before reaching
   `UnionToIntersection`.** `UnionToIntersection<never>` is `unknown`, which would silently satisfy
   any `Deps` slot.
2. **Per-key contracts remap over `Key` itself** (``[Each in Key as `findBy${Capitalize<Each>}`]``),
   never over the generated names. Mapping over generated names pairs every method with the union of
   every key's value type — the exact regression `ican-read-by.spec.ts` catches.
3. **Resolve a name back to a key by generating forward and index-collapsing**, never by
   `Uncapitalize` — its round-trip breaks outside camelCase (`URL` → `findByURL` → `uRL`).
4. **Order matters in exactly two places**: `RepositoryContractOf` tests `findManyByIds` before the
   per-key branch, and `PerKeyRepositoryContractOf` tests `findManyBy…` before `findBy…`. Do not
   reorder either.
5. **Never define `IEntityReader`/`IEntityWriter`/`IEntityRepository` by relisting contracts** —
   they are defined *through* `RepositoryOf` over their own catalogs so they cannot drift.
6. **A sensitive key must be suppressed on both doors**: `RepositoryFilterKeysOf` (the generator)
   *and* `RepositorySuppressedNamesOf` (constraining `Extras`). All four derived names
   (`findBy`/`findManyBy`/`countBy`/`existsBy`) go, not just the `find*` ones.
7. **`RepositoryFilterKeysOf` and `RepositorySensitiveKeysOf` stay two independent mapped types.**
   They are not complements — deriving one from the other readmits nested keys and loses `id`.
8. **Every change to the derived method catalog must be mirrored in
   `src/testing/helpers/repository-catalog-of.ts`** and pinned by the drift guard in
   `in-memory-repository-of.spec.ts`. That runtime list is the one duplicated rule in the package.
9. **Order keys need no runtime mirror** — they generate no method.

## Which keys generate a lookup

`RepositoryFilterKeysOf` starts from the blueprint plus `keyof IRawEntity` (so `id`, `createdAt`,
`updatedAt` are filterable) and drops:

- a **nested entity** key and a **nested record** key — filtering by a whole object graph is not a
  predicate; declare `authorId: UuidVO` or `currency: StringVO` and filter by that. Both branches are
  written out explicitly even though the record one would fall through to `never` anyway, because the
  branch *is* the documentation;
- a **wrapped** key (`arrayOf`/`optionalOf`/`nullableOf`) — a list is not a predicate;
- a **value-object that declared `sensitive: true`**, read through `IsSensitiveValueObjectClass`
  (`domain/value-object/types/is-sensitive-value-object-class.type.ts`, off-barrel, direct-path
  import).

`RepositoryCollectionFilterKeysOf` is `Exclude<RepositoryFilterKeysOf<P>, "id">`. One insertion point
covers all four families: `findByX`/`existsByX` come off the full set, `findManyByX`/`countByX` off
the collection set.

`existsById` exists (the primary-key check every insert makes); `countById` does not (its answer is
always 0 or 1 — the same argument that bans `findManyById`).

`ICanReadId` is a named alias of `ICanReadBy<E, "id">`, not a ninth contract.

`RepositoryReadMethodPattern` is `` `find${string}` | `count${string}` | `exists${string}` `` —
`` `count${string}` `` subsumes the bare `count`.

## Sensitive: only the value-object source suppresses

`sensitive: true` on a VO's `defineMeta` suppresses the port methods. `sensitive: [...]` on
`defineEntity`/`defineCommand` does **not** — it only redacts and answers `isSensitive`. That is
because `entityOf` takes its extra definition without a `const` type parameter and the hand-written
form loses the literal at its return annotation. Runtime alignment: `sensitiveKeysOf` reads only the
VO source (what the type sees), `resolveSensitiveKeys` merges both.

> Detail: [sensitive-suppresses-port.md](../../../docs/decisions/sensitive-suppresses-port.md)

## The two spec forms

`RepositoryOf` accepts a flat union of names and a grouped `{ read, write }` object, collapsed by
`RepositorySpecNamesOf`. **Only the flat form gets editor completions** at the type level (a literal
inside a tuple inside a type literal is not one of the four node kinds TypeScript's
`fromUnionableLiteralType` handles). Prefer the flat form when writing a spec by hand. At
`inMemoryRepositoryOf`'s *value* position both forms complete fully.

## Ordering is part of the port

`RepositoryPageOf<EntityClass>` carries `page`/`perPage`/`orderBy`/`direction`, **all four
required** — no default page size exists, and an unordered slice can repeat or skip rows between
calls.

`orderBy` resolves to `RepositoryOrderKeysOf`: `RepositoryFilterKeysOf` narrowed to keys carrying a
**single scalar**. When editing it, keep all three details — defined *over* the filter set,
`NonNullable` applied *before* the primitive test, and each primitive tested **in a tuple**
(`[X] extends [string]`) so a `unionVO([t.String(), t.Number()])` key is dropped.

> Detail: [ordering-is-part-of-the-port.md](../../../docs/decisions/ordering-is-part-of-the-port.md)
> · [repository-port-derivation.md](../../../docs/decisions/repository-port-derivation.md)
> · in-memory double: skill `beans-testing-double`
