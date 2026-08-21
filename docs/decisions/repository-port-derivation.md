# Repository port derivation

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`RepositoryOf<EntityClass, Spec, Mode, Extras>` maps each selected method name to its
contract through `RepositoryContractOf` and fuses the result with `UnionToIntersection`
(kept local to the pillar, not `shared/` — the house rule is "only what both pillars need
verbatim moves up").

`UnionToIntersection<never>` is `unknown`, not `never`, so `RepositoryOf` guards with
`[Selected] extends [never] ? never` *before* reaching it: without that, asking for the
write half of a read-only spec would resolve to `unknown` and silently satisfy any `Deps`
slot.

Two mutually assignable spec forms — a flat union of names and a grouped `{ read, write }`
object — collapsed to one union by `RepositorySpecNamesOf`; only the flat form gets editor
completions, because TypeScript's `fromUnionableLiteralType` handles only
`ExpressionWithTypeArguments`, `TypeReference`, `IndexedAccessType` and `UnionType`, and a
literal inside a tuple inside a type literal is none of those (measured against the real
LanguageService: 15 / 14 / 0 / 2).

The per-key contracts (`ICanReadBy`, `ICanReadManyBy`) are mapped types remapping over
`Key` itself (``[Each in Key as `findBy${Capitalize<Each>}`]``), **not** over the generated
names — with `Key` a union the latter pairs every method with the union of every key's
value type, which is the one regression `ican-read-by.spec.ts` exists to catch.

`PerKeyRepositoryContractOf` resolves a name back to a key by generating **forward** and
index-collapsing (the "map then index-collapse" idiom), never by `Uncapitalize`, whose
round-trip breaks outside camelCase (`URL` → `findByURL` → `uRL`).

`ICanReadId` is a named alias of `ICanReadBy<E, "id">`, not a ninth contract: identity keys
are already in `RepositoryFilterKeysOf` via `keyof IRawEntity`, so `findById` falls out of
the same generator. `IEntityReader`/`IEntityWriter`/`IEntityRepository` are likewise defined
*through* `RepositoryOf` over their own catalogs rather than by relisting contracts, so they
cannot drift.

`RepositoryFilterKeysOf` drops three kinds of key: a **nested entity** and a **nested
record** (filtering by a whole object graph is not a predicate — declare `authorId: UuidVO`
or `currency: StringVO` and filter by that; both branches are written out explicitly even
though the record one would fall through to `never` anyway, because the branch *is* the
documentation) and a **value-object that declared itself `sensitive: true`**. A wrapped key
is dropped too — a list is not a predicate.

`RepositorySensitiveKeysOf` and `RepositoryFilterKeysOf` are written as two independent
mapped types rather than one `Exclude`-ing the other, because they are **not** complements:
the filter also drops nested entities and also *adds* the three identity fields, so deriving
one from the other would quietly readmit `profile` and lose `id`.

## Order sensitivity

Order carries weight in two places:

- `RepositoryContractOf` tests `findManyByIds` before falling through to the per-key branch
  (a blueprint key literally called `ids` loses the name to the batch loader — documented,
  not engineered around).
- `PerKeyRepositoryContractOf` tests `findManyBy…` before `findBy…` (every `findManyByX`
  also matches `findBy${string}`) — that is the *only* order-sensitive pair, since
  `countBy…`/`existsBy…` carry disjoint prefixes and sit last for readability alone.

## `countBy` / `existsBy`

`countBy{Key}` and `existsBy{Key}` (`ican-count-by.type.ts`, `ican-exists-by.type.ts`) come
out of the same generator and use the same `[Each in Key as …]` remapping the read halves
do. They split over `id` on purpose: `existsBy` is derived over `RepositoryFilterKeysOf` (so
`existsById` exists — the primary-key check every insert makes), `countBy` over
`RepositoryCollectionFilterKeysOf` (so `countById` does not — its answer is always 0 or 1,
the same argument that already bans `findManyById`).

`RepositoryReadMethodPattern` is `` `find${string}` | `count${string}` | `exists${string}` ``
— `` `count${string}` `` subsumes the bare `count`, so one alternative covers the fixed
method and every generated one instead of a literal plus a pattern that could drift.

## Pillar shape

`repository/` is `repository/types/` only, **type-only, with no `index.ts` at the pillar
root** — there is nothing to export at that level, so
`@roastery/beans/domain/repository/types` is the canonical subpath, paralleling
`.../entity/types` and `.../command/types`; nothing changed in `package.json` for it
(`exports["./*"]` + `tsup 'src/**/index.ts'` already cover any barrel), and `tsup` emits an
empty `index.js` next to the `.d.ts`, exactly as it already does for
`dist/domain/entity/types/`.
