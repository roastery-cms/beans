---
name: beans-domain-modeling
description: Use when writing or editing an `Entity` / `entityOf`, a `DomainRecord` / `recordOf` or a `ValueObject` / `defineMeta` — accessors, `AccessorsOf`, identity, `fromJSON`, `demo()`, `set`/`setMany`, `[Storage]`, `destroy()`, `isUnique`/`uniqueKeysOf`, `toJSON`/`toSafeJSON`, nested aggregates, `entityHas` / `reshapeShape` / `reshapeTo` — or when construction, mutation, hydration, serialization or a narrowed projection of a domain model behaves unexpectedly.
---

# Domain modeling: `ValueObject`, `Entity`, `DomainRecord`

Sibling skills carry the rest of this pillar: `beans-blueprint-rules` (`blueprint().with()` and `onSet`),
`beans-domain-events` (`raiseEvent`/`pullDomainEvents`), `beans-wrappers`
(`arrayOf`/`optionalOf`/`nullableOf`) and `beans-entity-decorators`.

## Inviolable rules

1. **`defineMeta` / `defineEntity` / `defineRecord` / `defineCommand` / `defineName` must be prototype
   methods, never class fields, and must be pure.** The base calls them *inside* the constructor, and a
   class-field initializer only runs after `super()` returns; `fromJSON`/`metaOf`/`definitionOf` invoke
   them on an `Object.create`d probe with no constructor run. Guarded with
   `InvalidEntityDefinitionException`.
2. **With the class form, the `interface X extends AccessorsOf<…> {}` merge is not optional.** The
   accessors are installed at runtime regardless; the merge is how TS learns about them. Skipping it is
   the **one silent failure mode** left in the package. Prefer `entityOf`/`recordOf`, which need no merge.
3. **A blueprint key may not collide with an existing member** (`schema`, `toJSON`, `get`, `set`, `id`,
   `equals`, …) — `PropertyNameCollisionException`, checked before anything is defined, so the install is
   atomic. The test is `key in prototype`, and the three pillars are three **unrelated** prototype
   chains, so a member reserves its name only in the pillar that declares it: `equals` in `Entity` and
   `DomainRecord`, `sameStateAs` in `Entity` only, neither in `Command`. (`name` is safe — it lives on
   the constructor.) A **record** blueprint may additionally not name `id`/`createdAt`/`updatedAt`.
4. **`id`/`createdAt`/`updatedAt` never appear in an entity blueprint** — the base supplies them.
5. **`setMany` is the mutation primitive; `set` delegates to it.** Validate all, build all, then assign,
   so a rejected value leaves the entity untouched; `updatedAt` is stamped once, and only if something
   changed.
## `ValueObject`

`extends ValueObject<TValue, typeof XSchema>` and implement `defineMeta()`. That's the whole class — no
constructor, no `super`, no payload wrapper. Override `transform()` when the value needs normalising
before validation (e.g. `SlugVO` slugifies). Sugar statics are plain additions.

- **`meta.default` must pass `meta.schema`.** The base validates the default like any other value, and
  since `Entity` derives its schema from the blueprint, a bad default also breaks demo-mode construction
  of every entity using the class. (`SlugSchema` has `minLength: 1`, so `""` is not a valid `SlugVO`
  default — which is why the specs reach for a slug whenever they need a value the schema refuses.)
- **`meta.default` may be a thunk, and should be whenever it's expensive.** `defineMeta()` runs on every
  construction. `DateTimeVO` and `UuidVO` declare `default: () => new Date().toISOString()` and
  `default: generateUUID`; the base only calls it in demo mode. The discriminant is
  `typeof === "function"`, so a VO wrapping a *function* value would have to double-wrap it.
- **`transform` does not run over defaults** — declare them already in canonical form.
- **`meta.unique` is declarative and nothing in the domain enforces it.** It says the value must not
  repeat across the *rows* of the aggregate holding it — an invariant of the set, which neither a
  `ValueObject` (one value) nor an `Entity` (one aggregate) can see. Construction never fails because of
  it. Read back by `uniqueKeysOf(EntityClass)` / `Entity#isUnique(key)` and enforced by whoever
  implements the repository port. `Command` ignores it. Unlike `sensitive`, it is a plain `boolean`, not
  a type parameter — nothing at the type level reads it, so it suppresses nothing from the port.
- **Domain vocabulary is free by subclassing**: `class TagName extends StringVO {}` inherits `defineMeta`,
  `transform`, `demo` and the `instanceof` — including the parent's *lack* of constraints. Override
  `defineMeta` when the alias needs a stricter schema.

## `Entity`

`entityOf(properties, source, extra?)` is the default form — it returns a base already bound to the
blueprint, so the subclass declares only its own behaviour and the accessors come out typed **without**
the declaration merge:

```ts
class Author extends entityOf(authorProperties, "author") {
	public rename(value: string): void {
		this.set("name", value);
		this.raiseEvent(AuthorRenamed); // protected members stay reachable
	}
}
```

The class form (`extends Entity<typeof xProperties>` + `defineEntity()` + the `AccessorsOf` merge with its
`biome-ignore`) stays correct and is the one to reach for when a subclass **computes** its definition
rather than stating it.

- **A subclass may declare its own constructor** and delegate to `super(...)`; it must accept the base's
  context payload — one overload is enough — and forward any argument it doesn't recognise, because
  `demo()` passes a module-private sentinel through that same channel.
- **Accessors are read-only and mirror `get`**, so an entity- or record-valued key yields the nested
  **instance** and a wrapped key yields the unwrapped container. `set`/`setMany` remain the only mutation
  path, which is what keeps the `updatedAt` stamp explicit.
- **Subclassing a concrete entity works.** The install walks the prototype chain, collects the keys an
  ancestor already covers and defines only the missing ones, so a subclass overriding `defineEntity` with
  a *wider* blueprint still gets accessors for its new keys.
- `noUnsafeDeclarationMerging` is **off** in `biome.json` because of the merge pattern;
  `noUnusedVariables` still fires on each interface, hence the one-line `biome-ignore` per declaration.

### Identity and the three construction paths

- **Identity is optional in the payload, all-or-nothing.** Either none of `id`/`createdAt`/`updatedAt`
  appears (the base stamps a fresh identity via `UuidVO.generate` / `DateTimeVO.now`, in
  `buildBaseContext`), or `id` **and** `createdAt` come together with `updatedAt` still optional. Half a
  payload is a compile error, and `extractIdentity` mirrors that guard at runtime for plain-JS callers,
  throwing `IncompleteIdentityException` — a class with no `property` slot, since the identity is one unit
  and it is the whole unit that is incomplete.
- **Two hydration paths, and they differ.** `new X({ ...row })` validates VO by VO and ignores keys
  outside the blueprint. **`X.fromJSON(row)` is static** — it validates the whole payload against the
  aggregate schema first, rejecting missing **and extra** keys with `InvalidDomainDataException`, and
  needs no throwaway instance. Use it for payloads of untrusted origin. Both preserve the payload's
  identity.
- **`X.demo()` is the entry point without data** — a static, like `fromJSON`. Each VO falls back to its
  `[Meta].default` and nested entities recurse into their own demo mode.
- **Class fields on the subclass are fine.** All three paths build through `Reflect.construct`, which runs
  the subclass constructor and its field initializers. Two consequences: the constructor body **also runs**
  on hydration and in demo mode (side effects included), and domain state still belongs in the blueprint,
  transient state in `[Storage]`.

### Reads, writes and the schema

- **`get` and `set` reject unknown keys** with `InvalidPropertyException` (the check is `Object.hasOwn`,
  not `in`, so `Object.prototype` keys don't leak in). `get("updatedAt")` on an unmutated entity still
  returns `undefined` — a known key with no value is a different case from an unknown key.
- **Writing to an identity field is a different failure from writing to an unknown key**: identity fields
  raise `ImmutablePropertyException` (readable, never writable), unknown keys `InvalidPropertyException`.
  `get` accepts the identity fields, so it only ever raises the latter.
- **The schema belongs to the blueprint, not the instance** — derived from the property classes and
  memoized in a module-level `WeakMap` keyed by the blueprint object, so every instance of a class shares
  one `t.TObject`. Every level is emitted with `additionalProperties: false`. Keeping that model stable is
  also what keeps validation cheap: `SchemaManager.match` caches the compiled validator against the
  schema's *object identity*.

### `[Storage]`, `destroy()`, `isUnique`

- **`[Storage]` is the sanctioned escape hatch for transient state** — the `EntityStorage` class, a
  per-instance `string → string` store for cached lookups and derived flags. `protected`, so a subclass
  exposes whatever facade it wants. Initialised in all three construction paths and **starts empty on
  `fromJSON`/`demo`**. Never reaches `toJSON` or `schema`, and cannot collide with an accessor (those only
  take string keys).
- **`destroy()`/`isDestroyed` are a lightweight marker, not a hard guard.** `destroy()` flips a true JS
  private field (`#destroyed`) and calls `this[Storage].clear()`. Idempotent — a second call is a no-op,
  which is what lets `onDelete` tell a real destruction from a repeated one. It does **not** guard
  `get`/`set`/`toJSON` afterwards.
- **`isUnique(key)` reports the declaration, never the stored data — and must stay that way.** It is
  resolved once per instance from `id` + each VO's `meta.unique` + the definition's `unique: [...]` list.
  It is **not** async and must not become async: "is this value already taken?" is a question about the set
  of rows, and making the method reach for storage would put an I/O call inside the domain layer. `id`
  always `true`; `createdAt`/`updatedAt` always `false`; an unknown key throws `InvalidPropertyException`
  rather than answering `false`. **The always-`id` guarantee lives in `helpers/resolve-unique-keys.ts`, not
  in `entityOf`** — seeding it in the factory would make the two forms disagree.

## `DomainRecord`

An `Entity` minus identity — and *with* mutation, which is what separates it from `Command`. It exists for
composite values that deserve behaviour (`Money`, `Address`, `DateRange`) rather than being flattened into
a `customObjectVO`.

```ts
class Money extends recordOf({ amount: IntegerVO, currency: StringVO }, "money") {
	public add(cents: number): boolean {
		return this.set("amount", this.amount + cents); // protected stays reachable
	}
}
```

- `set`/`setMany` are `protected` and carry `Entity`'s atomicity, but neither the `ImmutablePropertyException`
  guard (no identity to protect) nor the `updatedAt` stamp — **which makes the returned `boolean` the only
  signal that anything changed**.
- **No `[Events]`, no `raiseEvent`, no `[Storage]`, no `destroy()`, no `unique`.** `pullDomainEvents` exists
  purely to forward the walk into what the record nests; with `{ deep: false }` it always returns `[]`.
- `fromJSON` throws `InvalidDomainDataException` (domain-layer, **not** `Command.fromJSON`'s
  `BadRequestException`). `toJSON()` never redacts; `toSafeJSON()`/`toString()`/the inspect hook do.
- **The decorators do not apply**; `onUpdate` is the tempting one, and nothing guards it at runtime.

## Equality: `equals` and `sameStateAs`

Three pillars, three rules, and the base is what knows which one applies. **Never write
`deepEquals(a.toJSON(), b.toJSON())`** — that is the line this exists to replace, and it is wrong for an
entity (`toJSON` carries `createdAt`/`updatedAt`) and for anything nesting one.

| Call | Answers |
|---|---|
| `ValueObject.equals` | exact class + `deepEquals` over `value` |
| `Entity.equals` | exact class + same `id`. State is irrelevant |
| `Entity.sameStateAs` | exact class + one `propertyEquals` per **blueprint** key; identity excluded |
| `DomainRecord.equals` | `Entity.sameStateAs`'s body — no identity, so by-value *is* its equality |
| wrapper `equals` | same class + item by item, **order-sensitive** |

- **The type check is `Object.getPrototypeOf`, never `instanceof`.** `instanceof` is asymmetric — a
  subclass would equal its parent one way and not the other, and the relation would stop being an
  equivalence. The cost is the rule already stated everywhere: mint a class-returning factory once, at
  module scope. Two calls, two classes, never equal.
- **This is *stricter* than `propertyMatches`/`entityHas`/`reshapeTo`, on purpose.** Those ask whether a
  class satisfies a contract, where accepting a domain-vocabulary subclass is the point; `equals` asks
  whether two instances are the same thing, where a subclass is a different kind.
- **Every key delegates, through `propertyEquals` (`@/shared/helpers/property-equals`).** So a **nested
  entity compares by its `id`**: renaming `post.author` does not change `post.sameStateAs(other)`. Ask the
  nested entity itself when the question is about its state.
- **It compares the real values.** Not `toJSON()` (identity fields of every nested entity), not
  `toSafeJSON()` (two different secrets would compare as one placeholder). A `sensitive` key therefore
  compares correctly, and leaks nothing — the answer is a boolean.
- **`propertyEquals` needs no `undefined` branch**, and that is a guarantee: `buildContext` fills one built
  instance per blueprint key on every path, so an `optionalVO` key holds a value object wrapping
  `undefined` rather than an empty slot. The only `undefined` in an entity's `[Context]` is `updatedAt`,
  which is not a blueprint key.
- **`deepEquals` is not deprecated and is not the same tool.** It answers structural equality over a
  **DTO** — `setMany`'s change detection and the in-memory double's filtering both need exactly that,
  over raw values that were never domain instances.
- `Command` has no `equals`: it is an input DTO, has no identity, and its `toJSON` redacts. Sharing
  `installAccessors` costs it nothing — the test is `key in prototype`, so a command blueprint may name
  `equals` freely.
- **Adoption accepts a subclass this refuses.** `isBuiltInstance` tests `instanceof`, so a
  `DraftAuthor extends Author` is adopted into an `Author` key without a word and then equals no plain
  `Author`. Both rulers are right for their own question; see **Nesting** below for the seam.

> Detail: `docs/decisions/equality-per-pillar.md` · `docs/decisions/adoption-over-rebuild.md`.

## Nesting

A blueprint value may be a `ValueObject`, an `Entity`, a `DomainRecord`, or a wrapper around any of the
three. A `Command` blueprint has the value-object, record and wrapper branches but never a bare entity one —
so `arrayOf(User)` compiles in a command where `User` does not.

- `get("author")` returns the **nested instance** (chainable: `post.get("author").get("name")`,
  `post.price.add(10)`); `set("author", raw)` takes the nested value's *raw* payload — identity optional for
  an entity, absent for a record — and rebuilds it.
- **An already-built instance is adopted, not rebuilt.** `set("author", authorInstance)` (and the same at
  construction, and item by item inside a wrapper) keeps *that* object: `buildProperty` tests
  `isBuiltInstance` (`@/shared/helpers`) before reaching for `new`. That is what carries the instance's
  identity, its state and its buffered events across the assignment — rebuilding from an instance reads back
  only the identity, so an entity whose keys all carry rules came back filled with defaults, in silence. The
  type system already accepted the instance at that boundary; this is the runtime catching up. Value objects
  are excluded: their raw input *is* the wrapped value. The trade is aliasing — the same instance can now sit
  in two parents, and mutating it there shows in both. **The test is `instanceof`, so a subclass is adopted
  too** — the same ruler `entityHas`/`reshapeTo` hold up, and the opposite of `equals`'s exact prototype.
  See `docs/decisions/adoption-over-rebuild.md`.
- `toJSON`/`fromJSON`/`schema` all recurse; nesting keeps the rules at every depth.
- A validation error raised inside a nested entity carries **its own** `source` and field name
  (`("name", "author")`, not `("author", "post")`) — more precise, but the outer path is lost.
- **Mutating a nested entity or record directly does not stamp the parent's `updatedAt`**; only
  `post.set("author", raw)` does.
- **Cycles are detected, not survived** — `CyclicEntityDefinitionException` naming the type, from both the
  schema-derivation and the construction guard. Siblings of the same class are fine. The cycle still has to
  be broken.

## Shape questions: `entityHas` and `reshapeTo`

Both live in `domain/entity/helpers` and answer the same question — *is this key backed by this class?*
`entityHas` hands back a boolean, `reshapeTo` hands back the payload cut down to a target shape. Only the
reshape pair is re-exported from `@/way`. Both read the blueprint through the same `Object.create` probe
`fromJSON` uses; neither constructs anything.

```ts
class AuthorCard extends entityOf({ name: StringVO }, "author-card") {}

const nameOnly = reshapeShape({ name: StringVO });
const cardShape = reshapeShape({ title: StringVO, author: AuthorCard, tags: arrayOf(TagCard) });

PostCard.fromJSON(reshapeTo(cardShape, post)); // the intended use
```

- **A target is not a blueprint.** `reshapeShape` is the identity function `blueprint().done()` is — it
  exists for the `const` inference and to name the concept. It never reaches `entityOf`/`recordOf` and
  carries no rules: `default`/`derive` act on construction input, so a rule cannot stand in for a key an
  already-built source lacks. Do not reach for `blueprint()` here.
- **A key may nest another target instead of naming a class**, which is what saves declaring a throwaway
  subclass per level. **A class states multiplicity and must match the source's exactly** (`optionalOf(X)`
  does not accept an `arrayOf` key); **a nested target states none and adopts the source's** — `arrayOf`
  comes back as an array of cut items, `optionalOf` as the item or `undefined`, `nullableOf` as the item or
  `null`, an unwrapped aggregate as one object. A nested target against a *value-object* key throws: there
  is no aggregate to cut.
- **Identity rides along when the source is an `Entity`**, at the root and at every nested level — that is
  what makes the result feed another entity's `fromJSON`. A `DomainRecord` contributes none, and a nested
  target declares none, so that too is read off the source. `ReshapedTo` takes the discriminant from the
  source's own `toJSON`, which is why `ReshapableModel` is written structurally rather than as
  `IEntity | IRecord`: a union would resolve it against the union instead of the concrete subclass.
- **Nested aggregates match structurally; the value-object leaf is nominal** (the declared class or a
  subclass, shared with `entityHas` through `@/shared/helpers/property-matches`). So `AuthorCard` need share
  nothing with `Author` — the whole point — but two separate `customRecordVO()` calls are one type and two
  objects, so the type says `true` where the runtime says `false`. Mint the class once, at module scope.
- **The cut comes from `toJSON()`, never `toSafeJSON()`** — redacting would break the round trip that makes
  the payload hydratable. The instance is never touched; the return is a fresh DTO.
- **A mismatch throws `InvalidPropertyException`** with the dotted path in `property` (`"author.twitter"`;
  a divergence inside an array reports the item, `"tags[].headline"`), raised before anything is projected.
- **The wrapper passed to `entityHas` is only read** — its `wraps`/`wrapperKind` statics — never constructed
  and never asked for a schema, so an inline `arrayOf(PostTag)` in the *argument* is safe, unlike in a
  blueprint. An empty expected shape is `true`, vacuously.

> Detail: [record-is-entity-minus-identity.md](../../../docs/decisions/record-is-entity-minus-identity.md)
> · [per-pillar-cycle-guards.md](../../../docs/decisions/per-pillar-cycle-guards.md)
> · [redaction-asymmetry.md](../../../docs/decisions/redaction-asymmetry.md)
> · siblings: skills `beans-blueprint-rules`, `beans-domain-events`, `beans-wrappers`,
> `beans-entity-decorators`
