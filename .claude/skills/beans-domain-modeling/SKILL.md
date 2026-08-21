---
name: beans-domain-modeling
description: Use when writing or editing an `Entity` / `entityOf`, a `DomainRecord` / `recordOf` or a `ValueObject` / `defineMeta` — accessors, `AccessorsOf`, identity, `fromJSON`, `demo()`, `set`/`setMany`, `[Storage]`, `destroy()`, `isUnique`/`uniqueKeysOf`, `toJSON`/`toSafeJSON`, nested aggregates — or when construction, mutation, hydration or serialization of a domain model behaves unexpectedly.
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
   …) — `PropertyNameCollisionException`, checked before anything is defined, so the install is atomic.
   (`name` is safe — it lives on the constructor.) A **record** blueprint may additionally not name
   `id`/`createdAt`/`updatedAt`.
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
  purely as a forwarder for the deep form; the shallow form always returns `[]`.
- `fromJSON` throws `InvalidDomainDataException` (domain-layer, **not** `Command.fromJSON`'s
  `BadRequestException`). `toJSON()` never redacts; `toSafeJSON()`/`toString()`/the inspect hook do.
- **The decorators do not apply**; `onUpdate` is the tempting one, and nothing guards it at runtime.

## Nesting

A blueprint value may be a `ValueObject`, an `Entity`, a `DomainRecord`, or a wrapper around any of the
three. A `Command` blueprint has the value-object, record and wrapper branches but never a bare entity one —
so `arrayOf(User)` compiles in a command where `User` does not.

- `get("author")` returns the **nested instance** (chainable: `post.get("author").get("name")`,
  `post.price.add(10)`); `set("author", raw)` takes the nested value's *raw* payload — identity optional for
  an entity, absent for a record — and rebuilds it.
- `toJSON`/`fromJSON`/`schema` all recurse; nesting keeps the rules at every depth.
- A validation error raised inside a nested entity carries **its own** `source` and field name
  (`("name", "author")`, not `("author", "post")`) — more precise, but the outer path is lost.
- **Mutating a nested entity or record directly does not stamp the parent's `updatedAt`**; only
  `post.set("author", raw)` does.
- **Cycles are detected, not survived** — `CyclicEntityDefinitionException` naming the type, from both the
  schema-derivation and the construction guard. Siblings of the same class are fine. The cycle still has to
  be broken.

> Detail: [record-is-entity-minus-identity.md](../../../docs/decisions/record-is-entity-minus-identity.md)
> · [per-pillar-cycle-guards.md](../../../docs/decisions/per-pillar-cycle-guards.md)
> · [redaction-asymmetry.md](../../../docs/decisions/redaction-asymmetry.md)
> · siblings: skills `beans-blueprint-rules`, `beans-domain-events`, `beans-wrappers`,
> `beans-entity-decorators`
