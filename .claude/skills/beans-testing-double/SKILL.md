---
name: beans-testing-double
description: Use when writing or editing anything under `src/testing/` (`inMemoryRepositoryOf`, `repositoryCatalogOf`, `filterKeysOf`, `uniqueConflictOf`, `compareRaw`), when a test needs a repository double for an entity, when the double's behaviour surprises (a mutation not persisting, `toBe` failing, empty events, a unique or not-found error), or when adding a port method that the double must also generate.
---

# The in-memory repository double

`@roastery/beans/testing` ships `inMemoryRepositoryOf` (`src/testing/in-memory-repository-of.ts`),
which generates a working in-memory repository from an entity's blueprint and types it as **the very
same `RepositoryOf` port** a real adapter implements — not a parallel test interface, so a double is
substitutable by construction.

**Not a layer** — a *time-of-use* concern, and the first runtime in `beans` outside the two layers,
which is why it sits behind its own subpath and is deliberately absent from `way/`. A production
bundle must not reach it by accident.

```ts
const users = inMemoryRepositoryOf(User);                      // whole catalog
const readonlyUsers = inMemoryRepositoryOf(User, ["findById"]); // exactly one method
const flaky = inMemoryRepositoryOf(User, [], { create: … });    // [] to reach the third argument
```

## Inviolable rules

1. **The double must stay faithful, not convenient.** It stores `toJSON()` and rehydrates through
   `fromJSON` on every read. Do not add identity caching to make `toBe` hold.
2. **Every filter comparison goes through `deepEquals`, never `===`** — an array-valued VO serializes to
   an array reference equality would never match, silently.
3. **`filterKeysOf` must select exactly the same set as `RepositoryFilterKeysOf`, and tests
   positively** (`isValueObjectClass(properties[key]) && !sensitive.has(key)`). The old negative test
   (`!(prototype instanceof Entity)`) was a live bug the moment records landed.
4. **Sensitive keys come from `sensitiveKeysOf`, never `resolveSensitiveKeys`** — only the value-object
   source is visible to the type side.
5. **The unique scan reads `rows` directly**, not a generated `findBy*`: a repository built with
   `spec: ["create"]` has no readers and must still refuse a duplicate. Same reason `countBy`/`existsBy`
   go through `matching`, so `spec: ["existsByEmail"]` still answers.
6. **`paginate` sorts before slicing and breaks every tie by `id`** — that is what makes a page
   repeatable rather than merely stable within one call.
7. **`repository-catalog-of.ts` must be updated in lockstep with the type-level catalog**, and the drift
   guard in `in-memory-repository-of.spec.ts` (`as const satisfies` one way, an `Equal` assertion the
   other) must keep passing. This is the one place in the package where a rule exists twice.
8. **`src/testing/` imports no Node builtin** and `helpers/` has no `index.ts`.

## Arguments and the spec

Reads the blueprint via `definitionOf` — the same construction-free `Object.create` probe
`Entity.fromJSON` and `entityHas` use. Three arguments: the class, an optional spec, an optional handler.

The spec **applies at runtime, not only in the type**, and accepts both the array and `{ read, write }`
forms with none of the type level's completion asymmetry (a *value* position drives completions from the
contextual type). An empty or omitted spec means the **whole catalog**, deliberately inverting
`RepositoryOf`'s empty-selection-is-`never` rule, because `inMemoryRepositoryOf(User, [], handler)` is how
a caller reaches the third argument without narrowing the second.

The handler receives a **snapshot** of the generated methods plus `rows`/`hydrate`, and its return is
merged **over** them — so a colliding name replaces one while still reaching the original through the
snapshot: the decorator shape a double needs for "make the third call throw".

## Writes behave like a database

This pillar is the package's only consumer of `@roastery/terroir/exceptions/infra` — fitting, since it is
the one runtime here playing the role of an adapter.

- `create` throws `ConflictException` on an already-stored `id` (checked *before* the unique scan, so a
  primary-key violation is reported by its own name rather than as "duplicate field `id`") or on a taken
  unique value.
- `update`/`delete` throw `ResourceNotFoundException` when no row carries the id — a write affecting zero
  rows is the "forgot to persist" bug, not an insert.

Unique keys come from `uniqueKeysOf(entityClass)`, resolved once at factory time. `helpers/unique-conflict-of.ts`
follows SQL: a **nullish value never conflicts** (`NULL <> NULL` — the only thing making a
unique-but-optional key expressible), comparison goes through `deepEquals`, and `update` excludes the row
it is writing (which is what lets an unchanged unique value through, with no change-tracking needed).

`ConflictException` carries no `property` slot, so a test can assert the class but not which key collided.

## Ordering, and the two documented infidelities

`compareRaw` (`helpers/compare-raw.ts`) is the package's only comparator — `deepEquals` answers equality
and nothing more. It is three lines only because the type did the hard part: `RepositoryOrderKeysOf`
guarantees one primitive per key, so `a < b` never compares a string against a number. Nullish sorts last
(SQL's `NULLS LAST`); the caller inverting the whole comparison for `"desc"` is what puts it first there,
matching `ORDER BY x DESC`.

Infidelities, both deliberate: string order is JS's UTF-16 code-unit order, not a collation's, and a
`customBinaryVO` key is base64 — orderable and meaningless.

## Expect these in tests

- Mutating after `create` does **not** persist; only `update()` does. That catches the "forgot to call
  update" bug rather than hiding it.
- `toBe` will not hold across a read, and `[Events]`/`[Storage]` come back empty.

> Detail: [in-memory-double-fidelity.md](../../../docs/decisions/in-memory-double-fidelity.md)
> · the port itself: skill `beans-repository-port`
