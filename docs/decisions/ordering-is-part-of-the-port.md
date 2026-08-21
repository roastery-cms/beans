# Ordering is part of the port, and its key set is not the filter set

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`RepositoryPageOf<EntityClass>` (`repository-page-of.type.ts`, replacing the non-parametric
`RepositoryPage`) carries `page`/`perPage`/`orderBy`/`direction`, all four required —
`perPage` because the package declares no default page size, `orderBy` because a slice of an
unordered set can repeat or skip a row between two calls, which the in-memory double *hides*
(a `Map` preserves insertion order) and a real database does not.

`orderBy` resolves to `RepositoryOrderKeysOf`, which narrows `RepositoryFilterKeysOf` to keys
carrying a **single scalar**: an array- or object-valued key (`StringArrayVO`,
`customObjectVO`, `customRecordVO`) is filterable — `deepEquals` defines equality for it — but
has no total order in JS or in `jsonb`, so `orderBy: "tags"` is a compile error rather than an
order that differs per adapter.

Three details are load-bearing:

1. It is defined **over** the filter set (inheriting the nested-entity and sensitive
   exclusions, and gaining the three identity fields, so `createdAt` needs no special case).
2. `NonNullable` is applied **before** the primitive test (a nullable column is orderable —
   what it needs is a nullish policy, resolved in the adapter, not exclusion).
3. Each primitive is tested **in a tuple** (`[X] extends [string]`), never distributed, which
   is what drops a `unionVO([t.String(), t.Number()])` key.

It needs **no runtime mirror** in `src/testing/` — order keys generate no method, so nothing
has to enumerate them, unlike the method catalog `repositoryCatalogOf` is forced to keep a
second copy of.
