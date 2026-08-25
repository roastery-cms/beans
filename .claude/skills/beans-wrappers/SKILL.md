---
name: beans-wrappers
description: Use when a blueprint key holds many of something, optionally one, or one-or-null — `arrayOf`, `optionalOf`, `nullableOf`, `defineWrapper`, `buildItem`, `wrapperModelFor`, `AnyWrapperClass` / `WrappableClass` / `WrapperKind` / `isWrapperClass` / `isWrapper`, anything under `src/domain/wrapper/` or `src/application/wrapper/` — or when a wrapped key's reads, defaults, events, schema `required` or repository methods behave unexpectedly.
---

# Multiplicity wrappers

`arrayOf(inner)`, `optionalOf(inner)` and `nullableOf(inner)` take one blueprint class — a `ValueObject`,
an `Entity` or a `DomainRecord` — and return another blueprint class that changes only *how many* of it a
key holds. `defineWrapper` is the core the three lower into (mirroring `defineValueObject`), `buildItem`
constructs one item by the inner class's own kind, and `wrapperModelFor` derives the schema.

## Inviolable rules

1. **Call the factories at module scope, once**, and **never wrap a wrapper** — `WrappableClass` is the
   type-level statement of that contract.
2. **`wrapper/helpers/model-for.ts` must stay class-free** — it is in the same mutual cycle as the entity
   and record `modelFor`s, and safe only for that reason.
3. **Probe the two statics inline** (`wrapperKind`, `wraps`) in blueprint conditionals, never
   `extends AnyWrapperClass` — the full structural form TS2589s at every key of every blueprint.
4. **The class-side disjunction is a static** (`readonly wraps?: never` on `AnyEntityClass` /
   `AnyRecordClass`), because a wrapper instance is structurally identical to a record one.
5. **`get` unwraps and is tested *before* `isValueObject`** — a wrapper is a container.
6. **A wrapped key derives no repository method**, on both doors (`RepositoryFilterKeysOf` and
   `filterKeysOf`'s positive `isValueObjectClass` test).
7. **`pullDomainEvents()` must keep forwarding into the contents** — without it an entity inside an
   `arrayOf` keeps its events forever, the one completely silent failure in this feature. Only
   `{ deep: false }` stops the walk.

`arrayOf(inner)`, `optionalOf(inner)` and `nullableOf(inner)` take one blueprint class and return another
holding many of it, optionally one, or one-or-`null`.

```ts
const postProperties = blueprint({ title: StringVO, tags: arrayOf(PostTag), author: optionalOf(Author) }).done();
const post = new Post({ title: "x", tags: [{ name: "Alan Reis" }] }); // `author` omittable
post.tags[0].slug;          // "alan-reis" — the item's own `derive` rule ran
post.tags[0].rename("Bob"); // the item's verbs stay reachable
```

- **Construction relaxes item by item**, because `InputValueOf` is the same type either way.
- **Reads are unwrapped, and there is no `.add()`.** A wrapper states a multiplicity, it does not become a
  domain concept. Appending replaces the whole list through `set`, passing the existing items back **as they
  are**: `buildItem` adopts a value that is already an instance of the wrapped class (`isBuiltInstance`)
  instead of rebuilding it, which is what preserves each item's `id`, its state and its buffered events. A
  **serialized** item still rebuilds, and omitting its identity there mints a new one.
- **`optionalOf` and `nullableOf` are not interchangeable** — only `optionalOf` reaches
  `UndefinedableKeys` and drops its key out of the schema's `required`.
- **`demo()` yields an empty container** (`[]`/`undefined`/`null`).
- **A wrapped key derives no repository method**, on both doors.
- **`unique` inside a list is not checked and is not the list's business** — it is an invariant of a set of
  *rows*, read off the inner class by `uniqueKeysOf` and enforced by that class's port.
- `arrayOf(EmailVO)` and `customArrayVO(EmailSchema)` coexist: the first wraps a *class* (inheriting its
  `transform`/`validate`/`sensitive`), the second a *schema*.
- An item's exception reports the wrapper's `source` (`"array-of"`, `"optional-of"`, `"nullable-of"`) and
  the item's index or `"value"` as its name, not the owning blueprint's key — the same trade a nested
  entity already makes.
- A cycle through a wrapper still throws `CyclicEntityDefinitionException`: the wrapper delegates to the
  same blueprint object, so the inner pillar's `deriving` guard catches it.
- **A wrapped value-object keeps its own `sensitive: true`** — `toSafeJSON` reads the inner class's
  `defineMeta` through `metaOf` (resolved once per wrapper class) and redacts per item, with the item's
  index/`"value"` as `name` and the wrapper's `source`. Wrapping a class must not un-declare what it
  declares. `toJSON` stays lossless.
- `sensitive: [...]` *naming* a wrapped key does not redact the whole key — `isSensitive` says `true`,
  `toSafeJSON` takes the container branch and each item applies its own rules.
- **`SchemaOf`'s wrapper branch is `WrappedSchemaOf`** (`t.TArray` / `t.TUnion` with `t.TUndefined` or
  `t.TNull`), mirroring `wrapperModelFor`. `CommandSchemaOf` reaches the same type through
  `CommandPropertySchemaOf`. Before those existed a wrapped key typed as `never` while the runtime was
  correct — the quiet kind of wrong, and the shape to check for in any new mapped type over a blueprint.
- **`equals` compares the contents item by item, in order**, delegating each item to its own `equals`
  through `propertyEquals` — so a wrapped entity compares by its `id`, never by its state, and never
  through `toJSON()`. The guard is `other instanceof Wrapper` against the class *that* `defineWrapper` call
  minted: the same "exact class" rule the three bases apply, and also what makes the private `#items`
  readable at all. Without it, a container from a different `arrayOf(Tag)` call would throw a `TypeError`
  instead of answering `false`. Note this is **stricter than `entityHas`'s two-statics comparison below**,
  and deliberately so — that asks whether a class satisfies a contract, this asks whether two containers
  are the same thing. The method is declared on `IWrapper`, or it exists at runtime and vanishes from the
  `.d.ts`.
- **`entityHas`/`EntityHas` compare a wrapper by its two statics**, never by identity: every `arrayOf(X)`
  call mints a fresh class. Multiplicity is part of the shape there — `{ tags: PostTag }` does not match
  `tags: arrayOf(PostTag)`.

> Detail: [wrapper-type-constraints.md](../../../docs/decisions/wrapper-type-constraints.md)
> · [equality-per-pillar.md](../../../docs/decisions/equality-per-pillar.md)
> · [typescript-traps.md](../../../docs/decisions/typescript-traps.md)
> · siblings: skills `beans-domain-modeling`, `beans-repository-port`
