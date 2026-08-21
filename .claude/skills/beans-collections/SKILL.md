---
name: beans-collections
description: Use when adding or editing a schema / value-object pair in `src/domain/collections/` (including the `optional/` and `nullable/` variants), when choosing between `StringVO` / `NumberVO` / `IntegerVO` / `DoubleVO` / `Positive*` / `Negative*` / `SchemaVO` / `DateTimeVO` / `UuidVO` / `BooleanVO` / `SlugVO` for a blueprint key, when mirroring a name into `application/collections/` or `way/collections/`, or when a demo default, `transform`, `-0`, rounding or a `Optional*`/`Nullable*` variant misbehaves.
---

# The collections catalog

`domain/collections/` ships pairs — for each primitive a `*.schema.ts` (the TypeBox schema itself) and a
`*.value-object.ts`, **21 of each**. There is no `*.dto.ts` layer: since terroir dropped the `Schema`
wrapper, the schema *is* the runtime value, so DTO and Schema collapsed into one name.

Five pieces: the 21 pairs, `value-objects/custom/` (factories — see skill `beans-custom-vo-factories`),
`value-objects/optional/`, `value-objects/nullable/`, and the hand-kept aliases under
`application/collections/` and `way/collections/`.

## Inviolable rules

1. **`Positive*` and `Negative*` include zero** (`minimum: 0` / `maximum: 0`) — they read as
   "non-negative"/"non-positive". Reach for the unconstrained form when zero must not be special.
2. **`NumberSchema` carries no bound at all.** It carried `minimum: 0` through 0.3; do not put it back —
   `PositiveNumberVO` is what that used to mean.
3. **`StringSchema` carries no `minLength`, so `StringVO` accepts `""`.** A property that must not be
   empty needs a VO whose schema says so; naming it `name` in a blueprint does not.
4. **What makes a `Double*VO` decimal or an `Integer*VO` whole is its `transform`, never the schema** —
   JSON Schema cannot express "floating point", and `2.0` is not distinguishable from `2` in JS.
   `IntegerSchema` is `t.Integer` (emitting `type: "integer"`, so an adapter can pick an integer column),
   not `multipleOf: 1`.
5. **`toInteger`/`toDouble` must normalise `-0` to `0`.** `JSON.stringify(-0)` is `"0"` while
   `Object.is(-0, 0)` is `false`, so an un-normalised `-0` fails its own round-trip. Both live in
   `value-objects/helpers/` (no `index.ts`, direct-path import) because each is used nine times.
6. **`transform` never runs over defaults** — declare a default already in canonical form (`SlugVO`'s
   default is `"slug"`, not something to slugify).
7. **`optionalVO`/`nullableVO` wrap a *schema*, not a VO's overrides** — so an `Optional*`/`Nullable*`
   variant of a VO carrying a `transform` or an essential `validate` must re-declare it, guarded for
   `undefined`/`null`. That applies to `OptionalSlugVO`, the six `Optional<Integer|Double>*VO`s,
   `OptionalSchemaVO` and each `Nullable*` twin.
8. **Do not mirror sugar statics into the variants** (`BooleanVO.truthy/falsy/from`, `DateTimeVO.now`,
   `UuidVO.generate`, `SchemaVO.match/from`) — reach for `SchemaVO.match(vo.value, x)` when the key is
   known to be set. `OptionalSchemaVO`'s `validate` is not an exception to this: it is essential
   validation, not a convenience.
9. **`optional/` and `nullable/` are not interchangeable.** `null` never extends `undefined`, so a
   `Nullable<X>VO`-backed key stays **required** (`new Post({ deletedAt: null })`), while an
   `Optional<X>VO`-backed key is omittable. `optional/` = "may not have been provided"; `nullable/` =
   "provided, and explicitly empty" (the usual `NULL` column).
10. **The `application/` and `way/` collections barrels only re-export** — explicit
    `export { X } from "@/domain/collections/…"` lines, never `export *`, never a redeclaration.

## The numeric grid

Nine of the twenty-one are the grid: three shapes (`Number`, `Integer`, `Double`) crossed with three signs
(unconstrained, `Positive*`, `Negative*`). `Double*Schema` is structurally identical to `Number*Schema`.

`toDouble` carries a documented infidelity: decimal rounding over a binary float is approximate, and
`1.005` at two places rounds to `1`, not `1.01`. Every alternative (the string-exponent trick, `toFixed`)
fails worse on a different input set, so the straightforward form is kept, its limit stated in the TSDoc
and asserted in `to-double.spec.ts`.

## `SchemaVO`, the odd one out

Its value is a **JSON-serialized TypeBox schema** (the wire form `SchemaManager.serialize` produces), for
the case a schema is itself domain data. It stores the wire string rather than a live `TSchema` because a
hydrated schema carries a non-enumerable `[Kind]` symbol that `JSON.stringify` strips.

Validation is in two layers and both are needed: `SchemaSchema`'s `"json"` format answers "does this
parse"; `validate()` answers "does TypeBox compile it" by hydrating. `SchemaVO.match(schema, value)` takes
the VO or a raw wire string — only the string form can throw, and it throws rather than answering `false`
because "that is not a schema" and "that did not match" are different answers. `SchemaVO.from(tSchema,
context)` is the producer side. Hydration is memoized in `value-objects/helpers/schema-cache.ts` — a `Map`
with `MAX_CACHED_SCHEMAS = 256` and a `clear()` on overflow (a ceiling, not an LRU).

## The optional / nullable subpaths

`Optional<X>VO` / `Nullable<X>VO` for every one of the 21, each just
`optionalVO(XSchema, { name: "Optional<X>VO" })` / `nullableVO(XSchema, { name: "Nullable<X>VO" })` — same
schema, `undefined`/`null` added to the accepted values, demo-mode default `undefined`/`null` instead of
the required VO's own.

## The aliases, and their parity specs

`application/collections/` mirrors every one of `domain/collections/`'s subpaths (`schemas`,
`value-objects`, `+ /optional`, `/nullable`, `/custom`, `/custom/types`) so a `Command` blueprint reaches
for `EmailVO` the same way an `Entity` blueprint does.

`way/collections/` mirrors the value-object subpaths only — `schemas` and `custom/types` are deliberately
excluded, since a low-ceremony blueprint only ever needs the VO classes themselves.

Both are kept in sync by hand **and** by a spec: `application/collections/collections-alias.spec.ts` and
`way/collections/collections-alias.spec.ts` assert, for every mirrored subpath, that the two barrels export
the same names (read from the source, so a type-only barrel counts too) **and** that each name resolves to
the very same object — a redeclaration in place of a re-export would keep every name lined up while
breaking `instanceof`.

> Detail: [numeric-grid-and-transforms.md](../../../docs/decisions/numeric-grid-and-transforms.md)
> · [schema-vo-and-cache.md](../../../docs/decisions/schema-vo-and-cache.md)
> · factories: skill `beans-custom-vo-factories`
