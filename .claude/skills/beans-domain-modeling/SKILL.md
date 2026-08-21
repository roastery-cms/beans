---
name: beans-domain-modeling
description: Use when writing or editing a domain model in this package or a consumer — an `Entity` / `entityOf` subclass, a `DomainRecord` / `recordOf`, a `ValueObject` / `defineMeta`, a `blueprint(...).with(...)` rule, an `onSet` handler, `arrayOf`/`optionalOf`/`nullableOf`, a `DomainEvent` / `defineDomainEvent` / `raiseEvent` / `pullDomainEvents`, `[Storage]`, `destroy()`, `isUnique`/`uniqueKeysOf`, `fromJSON`/`demo()`, nested aggregates, or when accessors, defaults, identity, mutation or serialization behave unexpectedly.
---

# Domain modeling: `ValueObject`, `Entity`, `DomainRecord`, wrappers, events

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
5. **Every mapped type over a blueprint must go through `DomainKeys<Shape>`**, or the `Rules` symbol slot
   leaks as an accessor / schema field / serialized key.
6. **A symbol used as a computed key is a *value* import.** `import type { Rules }` in a file that reads
   or writes `properties[Rules]` throws `ReferenceError: Rules is not defined` from inside `buildContext`
   — every construction breaks at once while the module graph loads fine.
7. **Rules act on input only** — never on `set`/`setMany`, never on `toJSON`, never on the schema.
8. **`setMany` is the mutation primitive; `set` delegates to it.** Validate all, build all, then assign,
   so a rejected value leaves the entity untouched; `updatedAt` is stamped once, and only if something
   changed.
9. **`raiseEvent` is `protected`** — a subclass calls it from its own business methods, never from
   `set`/`setMany`. It stamps `occurredAt`/`aggregateId` itself and does not accept them.
10. **Call `arrayOf`/`optionalOf`/`nullableOf` at module scope, once, and never wrap a wrapper.**

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

## Blueprint rules

`blueprint(shape).with(rules)` attaches per-property domain rules — `{ default }` (a fallback belonging to
the entity, outranking the VO's own) or `{ derive }` (computed from siblings). The two are mutually
exclusive.

```ts
const postTagProperties = blueprint({ name: TagName, slug: TagSlug, hidden: TagVisibility })
	.with({ slug: { derive: (raw) => raw.name }, hidden: { default: false } });

new PostTag({ name: "Alan Reis" }); // slug: "alan-reis", hidden: false
```

- **The rules live under the `Rules` symbol key on the blueprint object itself.** That is what makes the
  feature cheap: `Object.keys`/`Object.entries` skip symbols, so `modelFor`, `installAccessors`, `toJSON`
  and every other traversal keep seeing exactly the domain properties.
- **Ruled keys are optional in the constructor payload**, and so are **`undefined`-accepting keys**
  (`UndefinedableKeys`: any key whose VO's `value` type includes `undefined`, or an `optionalOf` wrapper).
  `null` is **not** picked up — a `nullableVO`/`nullableOf` key stays required.
- **Resolution is explicit value > `default` > `derive`**, all inside `buildContext`. Derivations run in
  **blueprint order** and read siblings already built and normalised (a `SlugVO` sibling reads back
  slugified); one reading a key derived later gets `undefined` and fails on that property's validation.
- **"Omitted" means `undefined`, not falsy** — an explicit `false`/`0`/`""` counts as supplied, which is
  what makes `{ hidden: { default: false } }` overridable with `true`.
- **Rules apply in `demo()`** — that is what makes fixtures coherent. Keys with no rule still go through
  the VO's `.demo()`.
- **Two phases because a literal cannot reference its own `typeof`.** `blueprint(shape)` alone returns
  **only** the builder, so forgetting to close it is a type error. **A rule-less blueprint closes with
  `.done()`**, which returns the shape *as given* — same object reference, no `Rules` slot. Do not write
  `.with({})`.

## `onSet`

A concrete, empty-by-default `protected` method on both `Entity` and `DomainRecord`, returning
`SetHandlersOf<Shape>`: at most one handler per blueprint key, run on the **raw** value immediately before
`buildProperty` materialises it — in `buildContext` (so `new`, `fromJSON` and `demo()` all go through it)
and in `setMany` (so `set` does too).

The handler returns `void` and enforces by **throwing**; it never rewrites the value, because normalising
is `transform`'s job. Its second argument is `Readonly<InputValuesOf<Shape>>` — the *same* view
`PropertyRule.derive` receives, because at construction time `[Context]` does not exist yet.

Four consequences, each a decision: a handler fires **only when there is a raw value to set** (explicit
payload, blueprint `default`, or `derive` result), which is why `demo()` fires only the derived keys; it
runs **before** the value-object validates, so the business rule precedes the schema; in `setMany` it runs
before the whole build phase, preserving the documented atomicity; and it fires **per attempted write**,
not per effective change.

**The class-field trap is only half-catchable here**: at construction `this.onSet` still resolves to the
base's empty prototype method with no trace of the field, so `readSetHandlers` throws
`InvalidEntityDefinitionException` on the first *mutation* instead. Documented, not engineered around.

`Command` gets no `onSet` — it never mutates, and its input failures are already re-tagged
`UnprocessableContentException` at its own boundary.

## Domain events

- **`raiseEvent`/`pullDomainEvents` are the domain-event buffer**, backed by the `[Events]` slot
  (per-instance `IDomainEvent[]`, `protected`, **starts empty on `fromJSON`/`demo`**).
- **Prefer raising from the aggregate root.** An event raised inside a nested entity lands in that
  entity's own buffer, and `pullDomainEvents` is **shallow by default**. `pullDomainEvents({ deep: true })`
  opts into the recursion, walking `[Context]` root-first — the form to use whenever a nested entity
  carries lifecycle decorators, or when a record or wrapper stands between (both forward the deep pull;
  without it an entity inside an `arrayOf` would keep its events forever, the one completely silent failure
  in that feature).
- **`beans` ships no dispatcher** — `pullDomainEvents` only drains the buffer (`splice(0)`); what happens
  with the result is the consuming application's call. `collectDomainEvents` is the sanctioned way to gather
  it across aggregates.
- **A payload-less event class can be passed bare** (`raiseEvent(AuthorRenamed)`) — `raiseEvent` does
  `new event(this.id)` when `typeof event === "function"`. A subclass whose constructor needs more than
  `aggregateId` is not assignable to `new (aggregateId: string) => Event`, so TypeScript routes it to the
  "already built" branch and rejects the bare form — the constructor signature is the guard, no runtime
  check needed.
- **`DomainEvent` is optional sugar over `IDomainEvent`, not a second contract.** A subclass declares only
  `defineName()` and passes `aggregateId` through `super()`; the base stamps `occurredAt`. Because
  `raiseEvent` always overwrites `occurredAt`/`aggregateId`, a `DomainEvent` instance and a plain
  `{ name, ...payload }` object behave identically there — reach for the class when an event has payload
  fields of its own.
- **`defineDomainEvent(name)`** builds a payload-less `DomainEvent` class from just its name. Scope is
  deliberately payload-less only. Call it at module scope, once — each call mints a fresh class, so two
  calls with the same name produce classes `instanceof` does not relate. Its return is annotated
  `DomainEventClassOf` (TS4060), and the generated class's `.name` is set with the same two-line
  `Object.defineProperty` trick `defineValueObject` uses, copied inline rather than imported from
  `entity/decorators/helpers/` — that would be the first dependency from `domain-event/` back into
  `entity/`.

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

## Multiplicity wrappers

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
  domain concept. Appending replaces the whole list through `set`, passing the existing items back
  **through `toJSON()`**, which is what preserves their `id`s; omitting an item's identity mints a new one.
- **`optionalOf` and `nullableOf` are not interchangeable** — only `optionalOf` reaches
  `UndefinedableKeys` and drops its key out of the schema's `required`.
- **`demo()` yields an empty container** (`[]`/`undefined`/`null`).
- **A wrapped key derives no repository method**, on both doors.
- **`unique` inside a list is not checked and is not the list's business** — it is an invariant of a set of
  *rows*, read off the inner class by `uniqueKeysOf` and enforced by that class's port.
- `arrayOf(EmailVO)` and `customArrayVO(EmailSchema)` coexist: the first wraps a *class* (inheriting its
  `transform`/`validate`/`sensitive`), the second a *schema*.

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
> · [wrapper-type-constraints.md](../../../docs/decisions/wrapper-type-constraints.md)
> · [per-pillar-cycle-guards.md](../../../docs/decisions/per-pillar-cycle-guards.md)
> · [redaction-asymmetry.md](../../../docs/decisions/redaction-asymmetry.md)
> · decorators: skill `beans-entity-decorators`
