# The in-memory double is faithful, not convenient

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`@roastery/beans/testing` is home of `inMemoryRepositoryOf`
(`src/testing/in-memory-repository-of.ts`), which generates a working in-memory repository from
an entity's blueprint and types it as **the very same `RepositoryOf` port** a real adapter
implements — not a parallel test interface to keep in sync, so a double is substitutable by
construction.

**Not a layer**, like `way/` and `shared/`: `domain` and `application` are still the only two,
and this is a *time-of-use* concern. It is, however, the **first runtime in `beans` outside the
two layers**, which is exactly why it sits behind its own subpath and is deliberately absent
from `way/` (which curates the low-ceremony subset of *production* entry points): a production
bundle must not reach it by accident, and the `repository` pillar it doubles stays type-only,
with `dist/domain/repository/types/index.js` still literally 0 bytes.

## Arguments and the spec

Reads the blueprint via `definitionOf` — the same construction-free `Object.create` probe
`Entity.fromJSON` and `entityHas` use. Three arguments: the class, an optional spec, an optional
handler.

**The spec applies at runtime, not only in the type** (`["findById"]` yields an object with
exactly one method), and accepts both the array and `{ read, write }` forms — with none of the
type level's asymmetry, since a **value** position drives completions from the contextual type:
measured against the real LanguageService, both forms offer the full catalog here, where at the
type level only the flat union does.

An empty or omitted spec means the **whole catalog**, deliberately inverting `RepositoryOf`'s
empty-selection-is-`never` rule, because `inMemoryRepositoryOf(User, [], handler)` is how a
caller reaches the third argument without narrowing the second.

## Writes behave like a database, not a `Map`

This pillar is the package's **first and only consumer of
`@roastery/terroir/exceptions/infra`** — fitting, since `testing/` is the one runtime here that
plays the role of an adapter.

- `create` throws `ConflictException` on an already-stored `id` (checked *before* the unique
  scan, so a primary-key violation is reported by its own name rather than as "duplicate field
  `id`") or on a taken unique value.
- `update`/`delete` throw `ResourceNotFoundException` when no row carries the id, because a
  write affecting zero rows is the "forgot to persist" bug, not an insert.

The unique keys come from `uniqueKeysOf(entityClass)`, resolved once at factory time. Three
rules in `helpers/unique-conflict-of.ts` come straight from SQL rather than from convenience: a
**nullish value never conflicts** (`NULL <> NULL` — the only thing making a unique-but-optional
key expressible), comparison goes through `deepEquals` and never `===` (an array-valued VO would
never match by reference), and `update` excludes the row it is writing (which is what lets an
unchanged unique value through, with no change-tracking needed).

## `filterKeysOf` tests positively

`helpers/filter-keys-of.ts` must select **exactly** the same set as `RepositoryFilterKeysOf`,
and does so with a **positive** test — `isValueObjectClass(properties[key]) && !sensitive.has(key)`
— rather than the negative `!(prototype instanceof Entity)` it used through 0.4. The negative
form was a live bug the moment records landed: a record-valued key passed it while the type side
excluded it, so the double would have grown a `findByMoney`/`countByMoney` no port declares.
Testing positively also matches how `RepositoryFilterValueOf` already selects and stays correct
against a fourth property kind, and it removed the `import { Entity }` this file had to justify.

The other two rules are unchanged: the `[Rules]` symbol slot drops out via `Object.keys`, and
sensitive keys go through `sensitiveKeysOf`, **never** `resolveSensitiveKeys`, since only the
value-object source is visible to the type side. `filter-keys-of.spec.ts` pins the runtime set
against `RepositoryFilterKeysOf` in both directions.

The unique scan reads `rows` directly, **not** any generated `findBy*`: a repository built with
`spec: ["create"]` has no readers and must still refuse a duplicate — the same reason
`countBy`/`existsBy` go through `matching` rather than through a generated reader, so
`spec: ["existsByEmail"]` still answers.

## Pagination sorts before slicing

`paginate` **sorts before slicing** (`helpers/compare-raw.ts`, the package's only comparator —
`deepEquals` answers equality and nothing more) and **breaks every tie by `id`**, which is what
makes a page repeatable rather than merely stable within one call.

`compareRaw` is three lines only because the type did the hard part: `RepositoryOrderKeysOf`
guarantees one primitive per key, so `a < b` never compares a string against a number. Nullish
sorts last (SQL's `NULLS LAST`), and the caller inverting the whole comparison for `"desc"` is
what puts it first there, matching `ORDER BY x DESC`.

Two documented infidelities: string order is JS's UTF-16 code-unit order, not a collation's, and
a `customBinaryVO` key is base64, orderable and meaningless.

## Faithful, not convenient

The double stores `toJSON()` and rehydrates through `fromJSON` on every read, so mutating after
`create` does not persist (only `update()` does) — which catches the "forgot to call update" bug
rather than hiding it, at the stated price that `toBe` will not hold and `[Events]`/`[Storage]`
come back empty. Filtering goes through `deepEquals`, never `===`: an array-valued VO
(`StringArrayVO`/`UuidArrayVO`) serializes to an array that reference equality would never match,
silently.

The handler receives a **snapshot** of the generated methods plus `rows`/`hydrate`, and its
return is merged **over** them — so a colliding name replaces one while still reaching the
original through the snapshot, the decorator shape a double needs for "make the third call
throw".

## The one duplicated rule in the package

`helpers/repository-catalog-of.ts` is **the one place in the package where a rule exists twice**
(it lists four derived families rather than two), once as `RepositoryReadMethodsOf` and once as a
runtime list — unavoidable, since a union type is not enumerable at runtime — and
`in-memory-repository-of.spec.ts` carries a dedicated drift guard (`as const satisfies` in one
direction, an `Equal` assertion in the other) that is the whole reason the duplication is
acceptable. `helpers/` has no `index.ts`, same reasoning as `shared/helpers/`.
