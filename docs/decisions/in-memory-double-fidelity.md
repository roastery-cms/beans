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

## The transaction runner is a second double, over the same stores

`inMemoryTransactionOf(...repositories)` (`src/testing/in-memory-transaction-of.ts`) implements
**`ITransactionRunner`** — the same type-only port an adapter implements — exactly as the repository
double implements `RepositoryOf`. It exists because the no-op a test could already write,
`{ transaction: (work) => work() }`, proves the *ordering* claim (`COMMIT` → `emit` → react) and
nothing else: a row written by a `transactional` command that then failed stayed in the store, so the
one guarantee the boundary exists for was the one thing no test could assert.

**Why a `WeakMap` and not a member on the repository.** The runner needs the `Map` behind each
double, and the spec applies *at runtime* — `inMemoryRepositoryOf(User, ["findById"])` must produce
an object that literally has one method. Hanging `rows` (or a symbol-keyed slot) off that object
would put a member on it that no `RepositoryOf` declares, and a locally declared symbol is a thing
this package does not have anywhere. `helpers/row-stores.ts` keeps a module-level `WeakMap` keyed by
the finished repository object instead; `inMemoryRepositoryOf` registers after the handler ran, so
the entry is the same reference the caller holds, and weakness means an entry lives exactly as long
as the double does.

**Deep snapshot, restored on reject.** `structuredClone` copies the whole `Map` when the outermost
`run` opens, and a rejection clears each store and reinserts from it. Deep rather than
`new Map(rows)` because the pillar's posture is fidelity: `create`/`update` do always replace the
whole row, but a handler's `seed` writing through `context.rows` can mutate one in place, and a
rollback that left that standing would be a silent hole.

**The rejection propagates untouched**, never wrapped in `TransactionFailedException`: it is the
failure the caller has to see, and it is what stops `commands` before the publication loop — which
is how "a rolled-back operation publishes nothing" gets tested rather than asserted.

**A nested `run` joins the open transaction** (depth counter), so only the outermost call snapshots
and restores. `commands` already opens a boundary only at the outermost marked command; this makes a
hand-written nested `run` behave the same way, and is why the runner never has to be reentrant.

**Two things it deliberately does not do.** It does not roll back *entities* — there is no change
tracking here either, so an aggregate mutated inside a `handle` keeps its new values, the same way a
missing `update()` leaves the store untouched; undoing it would hide precisely the bug the double
exists to catch. And it does not model isolation between concurrent connections: reads inside the
transaction see its own writes, and nothing else is running. That is the pillar's third documented
infidelity, next to UTF-16 string ordering and base64-ordered binary keys.

**Scope is explicit and wiring fails loudly.** A double left out of the argument list is not rolled
back. An empty list, or an object `inMemoryRepositoryOf` did not build, throws
`DependencyNotWiredException` at construction — a runner that would silently restore nothing is a
wiring bug, and someone who wants a boundary that changes nothing already writes
`(work) => work()`. The `source` those exceptions carry is the same `"in-memory-repository"` the
repository double uses, now shared through `helpers/repository-source.ts`, so a test asserting the
slot does not have to know which of the two doubles failed.

## The one duplicated rule in the package

`helpers/repository-catalog-of.ts` is **the one place in the package where a rule exists twice**
(it lists four derived families rather than two), once as `RepositoryReadMethodsOf` and once as a
runtime list — unavoidable, since a union type is not enumerable at runtime — and
`in-memory-repository-of.spec.ts` carries a dedicated drift guard (`as const satisfies` in one
direction, an `Equal` assertion in the other) that is the whole reason the duplication is
acceptable. `helpers/` has no `index.ts`, same reasoning as `shared/helpers/`.
