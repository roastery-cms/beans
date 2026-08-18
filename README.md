# @roastery/beans

**Declare the model once, as a plain object. Everything else is derived** — validated construction, the aggregate TypeBox schema, `toJSON`/`fromJSON`, typed accessors, and coherent fixtures.

DDD building blocks for the [Roastery CMS](https://github.com/roastery-cms) ecosystem, split into a **domain** layer (`Entity`, `ValueObject`, `DomainEvent`) and an **application** layer (`Command`) — both driven by the same blueprint machinery.

[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

```ts
import { blueprint } from "@roastery/beans";
import { entityOf } from "@roastery/beans/domain/entity/helpers";
import { EmailVO, SlugVO, StringVO } from "@roastery/beans/domain/collections/value-objects";
import { OptionalStringVO } from "@roastery/beans/domain/collections/value-objects/optional";

const authorProperties = blueprint({
	name: StringVO,
	email: EmailVO,
	slug: SlugVO,
	bio: OptionalStringVO,
}).with({
	slug: { derive: (raw) => raw.name },
});

class Author extends entityOf(authorProperties, "author") {}

const author = new Author({ name: "Alan Reis", email: "alan@roastery.dev" });

author.slug; // "alan-reis" — derived from a sibling, already normalised
author.bio;  // string | undefined — the key was omittable because the VO accepts undefined
author.id;   // UUID v7, stamped by the base

Author.demo();              // a complete, coherent fixture — no factory, no faker, no seed file
Author.fromJSON(untrusted); // strict: the whole payload validated before anything is built
```

That is the entire class — one line. There is no constructor, no `create()` factory returning a wrapper, no hand-written schema, and no field declared twice. Add methods to it and they sit alongside everything the base already gives you.

## Why beans

### The blueprint *is* the model

`authorProperties` above is a plain object, and it is the single source of truth. The base reads it to derive the aggregate TypeBox schema (recursively, every level with `additionalProperties: false`), to install the accessors on the prototype, to drive `toJSON`/`fromJSON`, and to resolve the construction rules. The schema is memoized against that object's identity, so every instance of a class shares one compiled validator.

Domain rules ride on the same object, under a symbol key — `blueprint(shape).with({ slug: { derive } })` — so a property can carry a default or be computed from its siblings without a constructor, and without leaking into the schema or the serialized output.

### One line binds a class to its blueprint

`entityOf(properties, source)` returns a base class already wired to the blueprint, so a subclass declares only its own behaviour — and the accessors come out **typed**, with no declaration merge:

```typescript
class Author extends entityOf(authorProperties, "author") {
  public rename(value: string): void {
    this.set("name", value);
    this.raiseEvent(AuthorRenamed); // protected members stay reachable
  }
}

author.slug;   // string — typed
Author.demo(); // an Author, not the base
```

Extending `Entity` directly and implementing `defineEntity()` is unchanged and still right when a subclass computes its definition rather than stating it — but it costs three extra pieces of ceremony, and one of them is easy to forget:

```typescript
// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Author extends AccessorsOf<typeof authorProperties> {}
class Author extends Entity<typeof authorProperties> {
  protected defineEntity(): EntityDefinition<typeof authorProperties> {
    return { properties: authorProperties, source: "author" };
  }
}
```

Skipping that `interface` line still compiles and still works at runtime — the accessors just vanish from the type system. It is the one silent failure mode in the package, and `entityOf` removes the chance to hit it. `commandOf` is the same deal for the application layer, taking `Deps` and `Result` as explicit type arguments since no blueprint mentions them.

### `demo()` is a construction path, not a test helper

Every `Entity`, `Command` and `ValueObject` builds itself with no data at all:

```ts
Author.demo();
// { id: "01a0…", createdAt: "2026-…", name: "string", email: "user@example.com", slug: "string", bio: undefined }
```

Rules resolve in demo mode too, so the fixture is *coherent* rather than a bag of unrelated defaults — `slug` above is derived from the demo `name`, already slugified, exactly as it would be in production. Fixtures stop being a parallel codebase that drifts from the model.

### A catalog, not just a base class

**36 ready-made Value Objects** — 12 primitives (UUID, email, slug, datetime, password, URL, …), each with an `Optional*` and a `Nullable*` variant — plus their **12 TypeBox schemas** and **9 factories** (`customStringVO`, `customEnumVO`, `customObjectVO`, `optionalVO`, `nullableVO`, `defineValueObject`, …) for the constraints that do not deserve a file of their own.

`optional` and `nullable` are deliberately not interchangeable: an `Optional*VO` key may be omitted from the payload entirely (the type system knows it), while a `Nullable*VO` key must be passed as an explicit `null` — the usual "wasn't provided" (request body) vs. "provided, and empty" (database column) split, enforced at compile time.

### One engine, two layers

A `Command` is the same machine as an `Entity`, minus identity and minus mutation: same blueprint, same rules, same `demo()`/`fromJSON()`, same synchronous fail-fast validation on construction. What it adds is `execute(deps)` — the one place I/O belongs — returning `{ result, events }`.

```ts
class CreateAuthor extends Command<typeof createAuthorProperties, Deps, Author> {
	protected defineCommand(): CommandDefinition<typeof createAuthorProperties> {
		return { properties: createAuthorProperties, source: "create-author" };
	}

	public async execute(deps: Deps): Promise<CommandResult<Author>> {
		const author = new Author({ name: this.name, email: this.email });
		await deps.authors.save(author);
		return { result: author, events: collectDomainEvents(author) };
	}
}
```

Input validation failures are re-tagged at the command's boundary — `UnprocessableContentException` (422) for a bad field, `BadRequestException` (400) for a malformed payload — so error-handling middleware can tell "this request was wrong" apart from "a domain invariant broke" by reading `error[Layer]`, with the original preserved as `cause`.

## What beans is not

It stops where the opinions start, on purpose:

- **No `Result`/`Either`.** Invalid data throws a specific, typed exception (`InvalidPropertyException`, `ImmutablePropertyException`, `IncompleteIdentityException`, …), each carrying the property and the source.
- **No repository, no Unit of Work, no ORM integration.** `toJSON`/`fromJSON` are the persistence boundary; what sits on the other side is yours.
- **No DI container.** `commandRegistry` only gates access to a fixed, once-supplied dependency record at compile time — it doesn't resolve, construct, or scope dependencies for you.
- **No event bus and no dispatcher.** `raiseEvent` buffers, `pullDomainEvents` drains, `collectDomainEvents` hands the array to a `Command`'s caller. Publishing is the application's call.
- **No query side.** `Command` is the write path only.

## The building blocks

- **Entity** *(domain)* — Blueprint-driven base class: validated construction, `toJSON`/`fromJSON`, atomic `set`/`setMany` with automatic `updatedAt` stamping, typed accessors, nested aggregates, a transient `[Storage]` slot, a domain-event buffer, and `destroy()`. `id` (UUID v7), `createdAt` and `updatedAt` come built in.
- **ValueObject** *(domain)* — Immutable, self-validating wrapper around a value. The subclass declares only `defineMeta()`; validation runs in the constructor.
- **DomainEvent** *(domain)* — Optional abstract base for the events an `Entity` raises, plus `defineDomainEvent(name)` (a factory building a payload-less event class from just its name), three TC39 lifecycle decorators (`onCreate`, `onUpdate`, `onDelete`) that raise them automatically at a fixed point, and three TC39 method decorators (`beforeHandle`, `afterHandle`, `onError`) that raise them around an arbitrary instance method — the first two immediately before/after, `onError` when it throws.
- **Collections** *(domain, aliased under application)* — The Value Object / schema catalog and the custom factories described above.
- **Command** *(application)* — Blueprint-driven base for orchestrating domain behaviour behind a validated input, resolving to a `CommandResult` (`{ result, events }`).
- **CommandRegistry** *(application)* — Two-phase builder (`commandRegistry(spec).withDependencies(deps)`) that gates access to a set of `Command` subclasses by their declared dependencies, entirely at compile time, and hands back a ready-to-run bound function per command via `get()`.

## Technologies

| Tool | Purpose |
|------|---------|
| [@roastery/terroir](https://github.com/roastery-cms/terroir) | Schema validation, exception hierarchy, well-known symbols, and TypeBox re-exports |
| [TypeBox](https://github.com/sinclairzx81/typebox) | Runtime schema validation and TypeScript type inference |
| [slugify](https://github.com/simov/slugify) | URL-safe slug generation |
| [tsup](https://tsup.egoist.dev) | Bundling to ESM + CJS with `.d.ts` generation |
| [Bun](https://bun.sh) | Runtime, test runner, and package manager |
| [Knip](https://knip.dev) | Unused exports and dependency detection |
| [Husky](https://typicode.github.io/husky) + [commitlint](https://commitlint.js.org) | Git hooks and conventional commit enforcement |

## Installation

Install the package and its peer dependencies:

```bash
bun add @roastery/beans @roastery/terroir typescript
```

Or install them separately:

```bash
# Install the library
bun add @roastery/beans

# Install peer dependencies
bun add @roastery/terroir typescript
```

### Local development (link)

If you're developing `beans` alongside another project, you can link it locally:

```bash
# Inside the beans directory
bun run setup  # builds and registers the link

# Inside your consuming project
bun link @roastery/beans
```

---

## Entity

Abstract base class that every domain entity extends, driven by a **blueprint**: a plain object mapping each domain property to its `ValueObject` or `Entity` class. The subclass declares only `defineEntity()` — no constructor, no hand-written schema, no getters.

```typescript
import { Entity } from "@roastery/beans";
import type { AccessorsOf, EntityDefinition } from "@roastery/beans/domain/entity/types";
import { SlugVO, StringVO } from "@roastery/beans/domain/collections/value-objects";

const postProperties = {
  title: StringVO,
  slug: SlugVO,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
  protected defineEntity(): EntityDefinition<typeof postProperties> {
    return { properties: postProperties, source: "post" };
  }
}
```

Usage:

```typescript
const post = new Post({ title: "Hello", slug: "Hello World" });

post.title;                  // "Hello" — accessor derived from the blueprint
post.slug;                   // "hello-world" — the VO's transform ran
post.id;                     // UUID v7, generated by the base
post.set("title", "Hi");     // validates, replaces, stamps updatedAt; → true if it changed
post.setMany({ title: "Oi", slug: "oi" }); // atomic, one updatedAt stamp
post.toJSON();               // plain object
Post.fromJSON(row);          // strict static hydration, identity preserved
Post.demo();                 // fixture without data — every VO on its default
```

Key rules:

- **`defineEntity` must be a prototype method, never a class field** — the base invokes it during construction, before field initializers run. It must also be **pure**: `fromJSON` reads the blueprint through a probe without running any constructor.
- **Identity is optional in the payload, all-or-nothing.** Omit `id`/`createdAt`/`updatedAt` entirely for a fresh identity, or provide `id` **and** `createdAt` together (with `updatedAt` still optional). Half a payload is rejected at compile time and at runtime.
- **The `interface Post extends AccessorsOf<…> {}` line is what types the accessors.** They are installed at runtime regardless; the merge is how TypeScript learns about them. A blueprint key may not collide with an existing member (`schema`, `toJSON`, `get`, `set`, `id`, …) — the base throws `PropertyNameCollisionException` carrying the key.
- **Two hydration paths, and they differ.** `new Post({ ...row })` validates property by property and ignores unknown keys; `Post.fromJSON(row)` validates the whole payload against the aggregate schema first, rejecting missing **and** unknown keys. Use `fromJSON` for payloads of untrusted origin.
- **Aggregates nest.** A blueprint value may be another `Entity` subclass: accessors return the nested **instance** (so reads chain), `toJSON`/`fromJSON`/`schema` recurse, and `set("author", raw)` rebuilds the nested entity from its raw payload. Blueprint cycles are detected and reported as `CyclicEntityDefinitionException`.
- **The schema is derived, not declared.** `post.schema` is a TypeBox object built from the blueprint (identity fields included), compiled once per class and emitted with `additionalProperties: false` at every level.

### Blueprint rules

A blueprint can also carry the **domain's own rules** — which properties may be omitted, and how the base fills them. That is what keeps a subclass free of a hand-written constructor even when the domain has defaults and derivations:

```typescript
import { blueprint } from "@roastery/beans/domain/entity/helpers";
import { BooleanVO, SlugVO, StringVO } from "@roastery/beans/domain/collections/value-objects";

// Domain vocabulary: aliases inherit defineMeta and transform
class TagName extends StringVO {}
class TagSlug extends SlugVO {}
class TagVisibility extends BooleanVO {}

const postTagProperties = blueprint({
  name: TagName,
  slug: TagSlug,
  hidden: TagVisibility,
}).with({
  slug: { derive: (raw) => raw.name },  // omitted? comes from the name
  hidden: { default: false },           // the entity's default, not the VO's
});

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface PostTag extends AccessorsOf<typeof postTagProperties> {}
class PostTag extends Entity<typeof postTagProperties> {
  protected defineEntity(): EntityDefinition<typeof postTagProperties> {
    return { properties: postTagProperties, source: "post-tag" };
  }
}

new PostTag({ name: "Alan Reis" }); // slug: "alan-reis", hidden: false
```

`blueprint(shape)` on its own returns only the builder, so a blueprint has to be closed. When there are no rules, close it with **`.done()`** rather than `.with({})` — an empty rule map reads like one somebody forgot to fill in:

```typescript
const readUserProperties = blueprint({ id: UuidVO }).done();

// identical in every way — same object, no rules slot:
const readUserProperties = { id: UuidVO };
```

Both spellings work; `.done()` simply lets every blueprint in a codebase open and close the same way, instead of some starting with the helper and others with a bare literal.

The ruled keys become **optional in the constructor payload** — that is the whole type-level effect. Everything else holds:

| Aspect | Behaviour |
|--------|-----------|
| Precedence | explicit value > `default` > `derive` |
| `derive` input | the payload with every `default` already applied, and every sibling already built and normalised (a `SlugVO` sibling reads back slugified) |
| Ordering | derivations run in **blueprint order** and see the earlier ones; a derivation reading a key derived after it gets `undefined`, and the property's validation rejects it |
| `demo()` | rules apply, so fixtures stay coherent — `PostTag.demo()` yields `hidden: false` (the entity's default, not `BooleanVO`'s `true`) and a `slug` derived from the demo `name` |
| `set` / `setMany` | unchanged — rules do not re-fire; `tag.set("name", …)` leaves `slug` alone |
| Schema and `fromJSON` | unchanged — rules act on input only, `toJSON()` always emits every property, and hydration stays as strict as ever |
| Nesting | a nested entity's rules apply to its raw payload, so `new Post({ tag: { name: "Alan Reis" } })` is as valid nested as it is on its own — including through `set("tag", raw)` and in `demo()` |

A key backed by an [`Optional*VO`](#optional--nullable-value-objects) (or any `optionalVO(schema)`) gets that same optional-payload treatment **without needing a rule at all** — `subtitle?: string` compiles on its own. `Nullable*VO`/`nullableVO` keys do not: `null` is a value to state, not an omission.

`default` and `derive` are mutually exclusive, and a rule must name a property the blueprint declares — both are compile errors, and both throw `InvalidEntityDefinitionException` at runtime for plain-JS callers.

Two phases (`blueprint(…).with(…)`) because a literal cannot reference its own `typeof`: the first call fixes the shape, which is what makes `raw` fully typed inside `with`. A blueprint with no rules stays a plain object literal, exactly as before.

> **Where the `Rules` symbol lives.** Unlike the slots below, it is declared in this package for now (`src/entity/rules.symbol.ts`) and moves to `@roastery/terroir/symbols` in terroir 0.2.1 — see `docs/terroir-rules-slot.md`.

### Slot symbols

The bases key their internal slots with the ecosystem's well-known symbols, which live in **`@roastery/terroir/symbols`** — not in this package. Symbol equality is by reference, so one declaration site is what lets `beans` write a slot and a consumer read that same slot:

| Symbol | Purpose |
|--------|---------|
| `Context` | Identification context of a `ValueObject` / built property map of an `Entity` |
| `Meta` | Schema + demo default of a `ValueObject` |
| `Properties` | Blueprint of an `Entity` |
| `Rules` | Per-property domain rules (`default` / `derive`) a blueprint carries |
| `Source` | Entity-type name of an `Entity` (e.g. `"post"`) |
| `Storage` | Per-instance transient store of an `Entity` |
| `Events` | Per-instance domain-event buffer of an `Entity`, drained by `pullDomainEvents()` |
| `Demo` | Sentinel that turns a constructor call into demo mode — used by the `demo()` statics |

### EntityStorage

Each entity instance has a built-in key-value store (`string → string`) under the protected `[Storage]` slot. Useful for transient, non-domain state — it never reaches `toJSON()` or the schema, and starts empty on `fromJSON`/`demo`. Expose whatever facade fits your entity:

```typescript
import { Storage } from "@roastery/terroir/symbols";

class Post extends Entity<typeof postProperties> {
  // ...

  public addTag(tag: string): void {
    const current = this[Storage].get("tags") ?? "";
    this[Storage].set("tags", current ? `${current},${tag}` : tag);
  }

  public getTags(): string[] {
    return (this[Storage].get("tags") ?? "").split(",").filter(Boolean);
  }
}
```

The storage API is intentionally minimal:

| Method | Description |
|--------|-------------|
| `get(key)` | Returns the value, or `null` if the key does not exist (or a fallback's result, with the two-argument overload) |
| `set(key, value)` | Stores a value under the given key and returns it |
| `del(key)` | Removes the entry for the given key |

### Domain events

Each entity instance also has a built-in event buffer. Call the protected `raiseEvent` from a business method to record that something domain-meaningful happened; `set`/`setMany` never raise events on their own — nothing fires automatically. The base stamps `occurredAt` and `aggregateId` itself, so every event carries at least the id of the entity that raised it, and no subclass can get that wrong:

```typescript
class Order extends Entity<typeof orderProperties> {
  // ...

  public confirm(): void {
    this.set("status", "confirmed");
    this.raiseEvent({ name: "order.confirmed", total: this.total });
  }
}

const order = new Order({ /* ... */ });
order.confirm();
order.pullDomainEvents();
// [{ name: "order.confirmed", total: 42, occurredAt: "...", aggregateId: order.id }]
```

`pullDomainEvents()` is public: call it after a successful `repository.save(order)` to drain and dispatch the events. `beans` stops at the buffer — there is no event bus or dispatcher in this package, so what happens with the drained array is entirely up to the consuming application.

By default it drains **only that entity's own buffer**. An event raised inside a nested entity stays there — a nested entity is a participant in the aggregate, not a second root. Pass `{ deep: true }` to drain the whole aggregate, root first, then each nested entity recursively:

```typescript
post.pullDomainEvents();               // only what Post itself raised
post.pullDomainEvents({ deep: true }); // Post + its nested Author, recursively
```

Reach for `deep` whenever a blueprint holds an entity carrying [lifecycle decorators](#lifecycle-decorators) — a decorated nested entity raises on its own construction, and a shallow pull would leave that event in a buffer nobody reads. `collectDomainEvents` (application layer) always pulls deep for exactly this reason.

For an event with its own payload fields, `DomainEvent` (its own pillar, `@roastery/beans/domain/domain-event`) is an optional abstract base that saves you from repeating the object literal at every call site. A subclass declares only `defineName()`; `occurredAt` is stamped automatically, and the constructor's only required argument is `aggregateId`:

```typescript
import { DomainEvent } from "@roastery/beans/domain/domain-event";
import { Entity } from "@roastery/beans/domain/entity";

class OrderConfirmed extends DomainEvent {
  public constructor(
    aggregateId: string,
    public readonly total: number,
  ) {
    super(aggregateId);
  }

  protected defineName(): string {
    return "order.confirmed";
  }
}

class Order extends Entity<typeof orderProperties> {
  // ...

  public confirm(): void {
    this.set("status", "confirmed");
    this.raiseEvent(new OrderConfirmed(this.id, this.total));
  }
}
```

`raiseEvent` still stamps `occurredAt`/`aggregateId` on the way into the buffer regardless of what the passed event already carries, so a `DomainEvent` instance and a plain `{ name, ...payload }` object work the same way there — `DomainEvent` is sugar, not a different contract.

When an event carries no payload of its own — its constructor is exactly `DomainEvent`'s, taking only `aggregateId` — `raiseEvent` also accepts the **bare class reference**, no `new` required. It builds the instance itself, passing `this.id`:

```typescript
class OrderCancelled extends DomainEvent {
  protected defineName(): string {
    return "order.cancelled";
  }
}

class Order extends Entity<typeof orderProperties> {
  // ...

  public cancel(): void {
    this.set("status", "cancelled");
    this.raiseEvent(OrderCancelled); // no `new OrderCancelled(this.id)` needed
  }
}
```

This only works for a constructor shaped `new (aggregateId: string) => …` — `OrderConfirmed` above, whose constructor also takes `total`, is not assignable to that shape, so TypeScript rejects `this.raiseEvent(OrderConfirmed)` at compile time and routes you back to `this.raiseEvent(new OrderConfirmed(this.id, this.total))`.

For a payload-less event like `OrderCancelled`, writing the subclass is boilerplate — `defineDomainEvent(name)` builds the same class from just its name:

```typescript
import { defineDomainEvent } from "@roastery/beans/domain/domain-event";

const OrderCancelled = defineDomainEvent("order.cancelled"); // same class shape as above

class Order extends Entity<typeof orderProperties> {
  // ...

  public cancel(): void {
    this.set("status", "cancelled");
    this.raiseEvent(OrderCancelled);
  }
}
```

Call it at module scope, once — the same rule the [custom value objects](#custom-value-objects) already follow: each call mints a fresh class, so two calls with the same name produce unrelated classes and `instanceof` does not relate them. An event with payload fields of its own — `OrderConfirmed` above — still needs the hand-written subclass; a constructor with extra required parameters isn't something a `(name: string) => Class` factory can produce.

### Destroying an entity

`destroy()` marks an entity destroyed and releases its transient `[Storage]`. It's a lightweight marker, not a hard guard — there's no way to force garbage collection from inside the entity itself, so `get`/`set`/`toJSON`/etc. keep working afterwards. Idempotent: a second call is a no-op.

```typescript
const order = new Order({ /* ... */ });

order.isDestroyed; // false
order.destroy();
order.isDestroyed; // true
order.destroy();   // no-op — already destroyed
```

### Lifecycle decorators

Three class decorators, from `@roastery/beans/domain/entity/decorators`, declare which event each point of an entity's lifecycle raises automatically — so a subclass stops having to call `this.raiseEvent(...)` by hand at each of those points. Stackable: a class may carry all three, each touching only its own concern.

```typescript
import { onCreate, onUpdate, onDelete } from "@roastery/beans/domain/entity/decorators";

@onCreate(UserCreated)
@onUpdate(UserUpdated)
@onDelete(UserDeleted)
class User extends Entity<typeof userProperties> {
  protected defineEntity(): EntityDefinition<typeof userProperties> {
    return { properties: userProperties, source: "user" };
  }
}

const user = new User({ name: "Alan" }); // raises UserCreated
user.set("name", "Alan Reis");           // raises UserUpdated (only because something changed)
user.destroy();                          // raises UserDeleted (only on the first call)

User.fromJSON(row);                      // raises nothing — hydration is not a domain fact
new User({ id, createdAt, name: "..." }); // raises nothing either — same rule as fromJSON
```

- **`onCreate`** fires on a fresh construction — no `id`/`createdAt` in the payload, including `.demo()`.
- **`onUpdate`** fires when `set`/`setMany` actually changes something — it reads the `boolean` those return, so two real mutations in the same millisecond fire twice; a no-op `set` to the same value does not fire it at all.
- **`onDelete`** fires the first time `destroy()` is called; a repeated call does not fire it again.
- Each decorator takes a **payload-less** `DomainEvent` subclass reference — a constructor taking only `aggregateId`, the same bare-class form `raiseEvent` already accepts without `new`.
- The decorated class keeps its own `name`, so stack traces and DI containers still identify it as itself.
- **On a nested entity, pull deep.** A decorated class used as another blueprint's property raises into its *own* buffer, and `onCreate` fires every time the parent is built. Either decorate only aggregate roots, or drain with `parent.pullDomainEvents({ deep: true })`.
- **There is deliberately no `onRead`.** Rebuilding an entity from storage changes nothing, so it is not a domain fact — and an event raised there would ride along in every `CommandResult`, making a command that merely loads an aggregate to delete it report a spurious "read" next to the real event. Audit reads where reads actually happen: in the repository.

### Method decorators

Three method decorators, from the same `@roastery/beans/domain/entity/decorators` subpath, raise an event around an **arbitrary instance method** — not a fixed lifecycle point like the three decorators above, any business operation. `beforeHandle`/`afterHandle` raise immediately before or after the method runs; `onError` raises only if it throws.

```typescript
import { beforeHandle, afterHandle, onError, fromClass } from "@roastery/beans/domain/entity/decorators";

class Order extends Entity<typeof orderProperties> {
  protected defineEntity(): EntityDefinition<typeof orderProperties> {
    return { properties: orderProperties, source: "order" };
  }

  @beforeHandle(OrderShippingStarted)
  @afterHandle(OrderShippingCompleted)
  public ship(): void {
    // business logic
  }

  @onError(OrderShippingFailed) // bare class — same reading as onCreate/onUpdate/onDelete
  public shipOrAbort(): void {
    // business logic that may throw
  }

  @onError((error) => new OrderShippingFailed("", String(error))) // factory — carries the error
  public shipOrFail(): void {
    // business logic that may throw
  }
}

order.ship();       // raises OrderShippingStarted, runs ship(), then raises OrderShippingCompleted
order.shipOrAbort(); // if it throws: raises a fresh OrderShippingFailed, then re-throws
order.shipOrFail();  // if it throws: raises OrderShippingFailed built from the error, then re-throws
```

- **`beforeHandle`** fires immediately before the method body runs.
- **`afterHandle`** fires immediately after the method body returns — **never** if it throws; there is no `try`/`catch`, so a thrown exception simply propagates and the event never raises.
- **`onError`** fires only if the method body throws — it wraps the call in a `try`/`catch`, raises the event, then **always re-throws the original error**. It never swallows the failure; the event is a side channel only. A different `onError` from `eventedRegistry`'s own (see [Evented Registry](#evented-registry)), which isolates a throwing *reaction* by swallowing it — this one wraps an `Entity` method and never swallows.
- **`onError` accepts either a bare class (`@onError(SomeEvent)`, the same payload-less form the other four decorators take) or a factory (`@onError((error) => ...)`, for an event that folds the caught error into its own payload).** A bare class is normalized internally through `fromClass` — exported on its own for the times that factory value is needed detached from the decorator call. Reach for the factory only when the event actually needs the error.
- Stacking `beforeHandle`/`afterHandle` on the same method always raises in **before → method → after** order, regardless of which decorator is written closer to the method. `onError` composes the same bracket-nesting way: stacked innermost under `beforeHandle`/`afterHandle`, a throw still raises `beforeHandle`'s event and `onError`'s event, but `afterHandle`'s never fires — same "never fires on a throw" rule it already has on its own.
- None of the three `await` a returned `Promise` — an `async` method's `afterHandle`/`onError` react once the synchronous call returns (or synchronously throws), not once the promise settles or rejects.
- Applies to instance methods only; decorating a `static` method is not guarded at compile time or runtime.

---

## ValueObject

Immutable, self-validating wrapper around a value. The subclass declares only `defineMeta()` — the schema that validates the value and the default used in demo mode. Validation runs inside the base constructor, so an instance can never exist unvalidated.

```typescript
import { ValueObject } from "@roastery/beans";
import type { IValueObjectMetadata } from "@roastery/beans/domain/value-object/types";
import { StringSchema } from "@roastery/beans/domain/collections/schemas";

class FullName extends ValueObject<string, typeof StringSchema> {
  protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
    return { default: "string", schema: StringSchema };
  }
}

new FullName("Alan Reis", { name: "fullName", source: "user" });
FullName.demo({ name: "fullName", source: "user" }); // built from the default
```

Key rules:

- **`defineMeta` must be a prototype method, never a class field** — the base invokes it during construction. It must also be **pure**: `metaOf` (from `@roastery/beans/domain/value-object/helpers`) reads it through a probe without running any constructor.
- **`meta.default` must pass `meta.schema`.** The default is validated like any other value; an invalid default makes `demo()` throw and breaks the schema of any entity using the class.
- **`meta.default` may be a thunk**, and should be whenever it's expensive — `defineMeta()` runs on every construction, but a thunk is only invoked in demo mode (`UuidVO` declares `default: generateUUID`).
- **Override `transform()`** when the value has a canonical form (e.g. `SlugVO` slugifies before validating). `transform` does not run over defaults — declare them already canonical.

---

## Collections

### Value Objects

One VO per primitive, all on the self-validating base:

| Class | Value type | Description |
|-------|------------|-------------|
| `BooleanVO` | `boolean` | Boolean with `truthy()`, `falsy()`, `from()` helpers |
| `DateTimeVO` | `string` | ISO 8601 datetime with `now()` factory |
| `EmailVO` | `string` | Email address |
| `NumberVO` | `number` | Non-negative number |
| `PasswordVO` | `string` | Password with complexity rules |
| `SimpleUrlVO` | `string` | URI of any protocol |
| `SlugVO` | `string` | Auto-slugified string (`transform`) |
| `StringVO` | `string` | String of any length — no `minLength` |
| `StringArrayVO` | `string[]` | Array of strings |
| `UrlVO` | `string` | HTTP/HTTPS URL |
| `UuidArrayVO` | `string[]` | Array of UUIDs |
| `UuidVO` | `string` | UUID with `generate()` for new v7 IDs |

```typescript
import { BooleanVO, DateTimeVO, SlugVO, UuidVO } from "@roastery/beans/domain/collections/value-objects";

const context = { name: "slug", source: "post" };

const id = UuidVO.generate(context);          // wraps a new UUID v7
const slug = new SlugVO("My Post", context);  // .value === "my-post"
const now = DateTimeVO.now(context);          // wraps the current ISO timestamp
const flag = BooleanVO.from(1, context);      // .value === true
```

### Optional & nullable value objects

Every VO above has two ready-made variations, one subpath each, both built on top of the exact same schema — no separate constraints to keep in sync:

```typescript
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/domain/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/domain/collections/value-objects/nullable";
```

| | `Optional<X>VO` | `Nullable<X>VO` |
|---|---|---|
| Accepts | the real value, or `undefined` | the real value, or `null` |
| Demo-mode default | `undefined` | `null` |
| Blueprint key in the constructor payload | **optional** — `subtitle?: string` | **required** — `subtitle: string \| null` |
| Meaning | may not have been provided | provided, and explicitly empty |

The distinction is deliberate, not cosmetic: a request body typically omits a field it doesn't have (`undefined`), while a database column typically states its absence explicitly (`NULL`). Reach for the one that matches what's actually on the other end.

```typescript
const postProperties = {
  subtitle: OptionalStringVO,   // may be omitted from the payload entirely
  deletedAt: NullableUuidVO,    // must be named — either an id or `null`
};

new Post({ title: "Hi" });                          // subtitle omitted — fine
new Post({ title: "Hi", deletedAt: null });          // deletedAt stated explicitly
new Post({ title: "Hi", deletedAt: undefined });     // ✗ compile error — deletedAt is not optional
```

Both are just the corresponding VO's schema wrapped with `optionalVO`/`nullableVO` (below) — `OptionalSlugVO`/`NullableSlugVO` are the one exception that also re-declare `SlugVO`'s `slugify` transform, guarded against `undefined`/`null` respectively. Neither mirrors the required VOs' sugar statics (`BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate`).

### Custom value objects

The catalog above covers the primitives, not the domain's constraints. When a property needs "at least four characters" or "a non-empty list of UUIDs", declaring a schema plus a subclass for one rule is a lot of ceremony — so `@roastery/beans/domain/collections/value-objects/custom` ships factories that **return a class**, ready to drop into a blueprint:

```typescript
import {
  customArrayVO,
  customEnumVO,
  customNumberVO,
  customRecordVO,
  customStringVO,
  nullableVO,
  optionalVO,
} from "@roastery/beans/domain/collections/value-objects/custom";
import { UuidSchema } from "@roastery/beans/domain/collections/schemas";

const postProperties = {
  title: customStringVO({ options: { minLength: 4, maxLength: 120 }, default: "untitled" }),
  views: customNumberVO({ options: { minimum: 0 } }),
  authors: customArrayVO(UuidSchema, { options: { minItems: 1 }, default: () => [generateUUID()] }),
  status: customEnumVO(["draft", "published", "archived"], { default: "draft" }), // no `as const` needed
  subtitle: optionalVO(StringSchema),   // may be `undefined`, key becomes optional
  deletedAt: nullableVO(UuidSchema),    // may be `null`, key stays required
  metadata: customRecordVO(),
};
```

| Factory | Wrapped value | Options | Default when omitted |
|---------|---------------|---------|----------------------|
| `customStringVO(args?)` | `string` | `t.StringOptions` — `minLength`, `maxLength`, `pattern`, `format` | `"string"` |
| `customNumberVO(args?)` | `number` | `t.NumberOptions` — `minimum`, `maximum`, `multipleOf` | `0` |
| `customArrayVO(items, args?)` | `Static<items>[]` | `t.ArrayOptions` — `minItems`, `maxItems`, `uniqueItems` | `[]` |
| `customEnumVO(values, args?)` | one of `values` | `t.SchemaOptions` — `values` is a `const` tuple, no `as const` needed | `values[0]` |
| `customObjectVO(properties, args)` | the declared shape | `t.ObjectOptions` | — **required** |
| `customRecordVO(args?)` | `Record<string, unknown>` | `t.ObjectOptions` | `{}` |
| `optionalVO(schema, args?)` | `Static<schema> \| undefined` | `t.SchemaOptions` — wraps `schema` in `t.Union([schema, t.Undefined()])` | `undefined` |
| `nullableVO(schema, args?)` | `Static<schema> \| null` | `t.SchemaOptions` — wraps `schema` in `t.Union([schema, t.Null()])` | `null` |
| `defineValueObject(args)` | whatever the schema says | takes a ready `schema` instead | — **required** |

Every factory accepts the same hooks: `default` (value or thunk), `name` (stamped onto the class, for stack traces), `transform(value)` and `validate(value, context)`. The `validate` hook is a **predicate** running after the schema has already accepted the transformed value; returning `false` raises `InvalidPropertyException` with the owning entity's `name`/`source`, and throwing from inside propagates untouched.

```typescript
import { defineValueObject } from "@roastery/beans/domain/collections/value-objects/custom";
import { EmailSchema } from "@roastery/beans/domain/collections/schemas";

const CompanyEmail = defineValueObject({
  schema: EmailSchema,                                  // reuse an existing schema
  default: "alan@roastery.dev",
  name: "CompanyEmail",
  transform: (value) => value.trim().toLowerCase(),
  validate: (value) => value.endsWith("@roastery.dev"),
});
```

Key rules:

- **Call a factory at module scope, once.** Each call mints a fresh schema object *and* a fresh class. Compiled validators are cached against the schema's object identity and aggregate models against the blueprint object, so a factory called inside `defineEntity()` or `defineMeta()` recompiles on every construction. Nothing fails and nothing warns — it is only slow.
- **Two calls with identical arguments produce two different classes**, so `instanceof` does not relate them. Assign the class to a `const` and reuse it.
- **The default is validated inside the factory call**, not at the first `demo()`. `customStringVO({ options: { minLength: 8 } })` throws `InvalidEntityDefinitionException` at import time, because the `"string"` placeholder is six characters. Thunk defaults are trusted there — evaluating one would defeat its purpose — and the base still validates them in demo mode.
- **`customObjectVO` requires an explicit `default`.** No placeholder can satisfy an arbitrary set of required properties, so it asks rather than guesses.
- **`customObjectVO` sets `additionalProperties: false`**, matching how `Entity` emits every level of its aggregate model. Pass `options: { additionalProperties: true }` to opt out.
- **`customEnumVO`'s `values` is a `const` type parameter**, so `["draft", "published"]` is read as its literal tuple type without `as const` at the call site. The schema is built with TypeBox's native `t.Enum`, not a hand-rolled `t.Union` of `t.Literal`s.
- **`optionalVO`'s blueprint key becomes optional in the constructor payload**; `nullableVO`'s does not. `undefined` extends "not provided" and the runtime already read a missing key the same way; `null` is a value that has to be stated.
- Importing anything from this subpath registers the custom string formats, so `customStringVO({ options: { format: "slug" } })` validates against a registered format.

### Schemas

Pre-built [TypeBox](https://github.com/sinclairzx81/typebox) definitions for common types. Since terroir 0.2.0 dropped the `Schema` wrapper class, each of these **is** the runtime schema — there is no DTO/Schema pair to keep in sync, and nothing to unwrap before TypeBox's own API accepts it:

| Schema | Description |
|--------|-------------|
| `BooleanSchema` | Boolean |
| `DateTimeSchema` | ISO 8601 date-time |
| `EmailSchema` | Email address |
| `NumberSchema` | Non-negative number |
| `PasswordSchema` | Password (min 7 chars, uppercase, lowercase, digit, special) |
| `SimpleUrlSchema` | URL with any protocol |
| `SlugSchema` | URL slug |
| `StringArraySchema` | Array of strings |
| `StringSchema` | String of any length (no `minLength`) |
| `UrlSchema` | HTTP/HTTPS URL |
| `UuidArraySchema` | Array of UUIDs |
| `UuidSchema` | UUID |

```typescript
import { EmailSchema } from "@roastery/beans/domain/collections/schemas";
import { SchemaManager } from "@roastery/terroir/schema";

SchemaManager.match(EmailSchema, "user@example.com"); // true
SchemaManager.match(EmailSchema, "invalid");          // false
```

`SchemaManager.match` compiles each schema once and memoizes the validator against the schema's object identity — so pass a stable schema (a module-level constant like the ones above), never one built inline at the call site.

---

## Command

Abstract, blueprint-driven base for application-layer commands — the layer above `Entity` that validates a schema-shaped input and orchestrates domain behaviour behind it. Built the same way an `Entity` is (`blueprint(shape).with(rules)` works unchanged), but a `Command` carries **no identity** and **no mutation**: it is built once, read through typed accessors, and then `execute()`d with whatever dependencies its behaviour needs.

```typescript
import { blueprint } from "@roastery/beans/domain/entity";
import { Command } from "@roastery/beans/application";
import { collectResult } from "@roastery/beans/application/command/helpers";
import type {
  CommandAccessorsOf,
  CommandDefinition,
  CommandResult,
} from "@roastery/beans/application/command/types";
import { EmailVO, StringVO } from "@roastery/beans/application/collections/value-objects";
import { customStringVO } from "@roastery/beans/application/collections/value-objects/custom";

// Only exists here — the User entity never sees the password in plain text.
const PlainPasswordVO = customStringVO({ options: { minLength: 8 }, name: "PlainPasswordVO" });

const createUserProperties = {
  email: EmailVO,       // reused straight from the User entity's own blueprint
  name: StringVO,
  password: PlainPasswordVO,
};

type Deps = { secrets: SecretsService; users: UserRepository };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface CreateUserCommand extends CommandAccessorsOf<typeof createUserProperties> {}
class CreateUserCommand extends Command<typeof createUserProperties, Deps, User> {
  protected defineCommand(): CommandDefinition<typeof createUserProperties> {
    return { properties: createUserProperties, source: "create-user" };
  }

  public async execute({ secrets, users }: Deps): Promise<CommandResult<User>> {
    const passwordId = await secrets.hash(this.password); // I/O — only here, never in the constructor

    const user = new User({ email: this.email, name: this.name, password: passwordId });
    await users.save(user);

    return collectResult(user);
  }
}

const command = new CreateUserCommand({ email: "alan@roastery.dev", name: "Alan", password: "hunter2222" });
// ^ validates immediately — a short password or an invalid email throws right here, before any I/O.

const { result: user, events } = await command.execute({ secrets, users });
await eventPublisher.publishAll(events);
```

Key rules:

- **`defineCommand` must be a prototype method, never a class field** — same trap, same guard (`InvalidEntityDefinitionException`) as `Entity.defineEntity` and `ValueObject.defineMeta`.
- **The blueprint is `ValueObject`-only** — never a nested `Entity` or `Command`. A command's input is a flat, validated payload, not an aggregate; this is also why there is no cycle to guard against, unlike `Entity`.
- **No `set`/`setMany`, no `id`/`createdAt`/`updatedAt`** — a `Command` that needs to change something calls behaviour on the `Entity` it orchestrates inside `execute()`, never mutates itself.
- **`execute()` is the only place with I/O or side effects.** Construction stays synchronous and fails fast on bad input; `execute(deps)` is where repositories and external services (like a password-hashing service) get called.
- **`CommandResult<Result>` is `{ result, events }`.** `events` is always an array, never `undefined` — `Command` never publishes them itself, it only surfaces what `collectDomainEvents`/`collectResult` drained from the aggregates `execute()` touched, leaving the decision of when/how to publish to the caller.
- **`collectDomainEvents(...aggregates)`** drains one or more `pullDomainEvents()`-shaped buffers and concatenates them in call order, **pulling deep** so events raised by nested entities are not stranded. Since `Entity.raiseEvent` is `protected`, an event can only be raised from inside the entity's own business method (`user.deactivate()`, not `command.deactivate()`) — `execute()` calls that method, then collects what it raised.
- **`collectResult(result, ...rest)`** collapses the common `{ result: entity, events: collectDomainEvents(entity) }` pair into one call — `entity` is both the `CommandResult.result` and the primary aggregate `collectDomainEvents` drains; any further aggregates touched during `execute()` can still be passed along. Reach for `collectDomainEvents` directly when the result isn't itself an aggregate (a `string`, `null`, …).
- **`demo()` and `fromJSON()` work exactly like their `Entity`/`ValueObject` counterparts** — `demo()` for fixtures (rules apply the same way, keeping a fixture's fields coherent), `fromJSON()` for strict hydration of untrusted payloads (rejects missing **and** extra keys).
- **Validation failures surface as application-layer exceptions, not domain-layer ones.** A property that fails validation during construction (e.g. `new CreateUserCommand({ email: "not-an-email", ... })`) throws `UnprocessableContentException` (422) — not the `InvalidPropertyException` a `ValueObject` normally throws — because the input crossed the command's own boundary, not a domain invariant. The original `InvalidPropertyException` is preserved as `error.cause`. `fromJSON` rejecting a payload shaped wrong (missing/extra keys) throws `BadRequestException` (400) the same way. Both come from `@roastery/terroir/exceptions/application`, and both carry `[Layer] === "application"` (from `@roastery/terroir/symbols`) — so error-handling middleware can tell a command's own input validation apart from a deeper domain-layer failure. Definition-time mistakes (`defineCommand` as a class field, a colliding blueprint key) stay domain-layer, since they're not about request input at all.
- **`@roastery/beans/application/collections/*`** mirrors every domain collections subpath (schemas, value-objects, and their `optional`/`nullable`/`custom` variants) — the exact same classes, re-exported so a command blueprint never has to import from `@roastery/beans/domain` directly.

---

## Command Registry

`commandRegistry` gates access to a set of `Command` subclasses by their declared dependencies — entirely at compile time. Declare the spec, then supply the dependency record once; `.get(key)` hands back a function already bound to it.

```typescript
import { commandRegistry } from "@roastery/beans/application/command-registry";

type Deps = { secrets: SecretsService; users: UserRepository };

const registry = commandRegistry({
  createUser: CreateUserCommand,   // needs `secrets` and `users`
  renameTag: RenameTagCommand,     // Deps = void — needs nothing
}).withDependencies({ secrets, users });

const { result: user, events } = await registry.get("createUser")({
  email: "alan@roastery.dev",
  name: "Alan",
  password: "hunter2222",
});
await eventPublisher.publishAll(events);
```

Key rules:

- **`.get(key)` returns a ready-to-run bound function, not the class and not an unexecuted instance.** `registry.get("createUser")(payload)` constructs `CreateUserCommand` with `payload` and immediately calls `.execute(dependencies)` on it, using the record `withDependencies` was given — resolving to the same `CommandResult<Result>` `execute()` itself returns.
- **The "only registrable if its dependencies are present" rule is compile-time only.** A key whose command's `Deps` the supplied dependency record doesn't structurally satisfy is a type error on `.get()`, never a runtime check — `Command` itself gains no new member, symbol, or slot for this. Nothing stops a caller who bypasses TypeScript.
- **A command declaring `Deps = void` is always registrable**, no matter what the dependency record contains — it reads nothing from `execute`'s argument.
- **An unknown key at runtime throws `InvalidPropertyException`** — the same exception `Command.get()` already reuses for its own "key the blueprint never declared" guard.
- **This is not a DI container.** `commandRegistry` doesn't resolve, construct, or scope anything — the dependency record is whatever plain object you already built, passed through unchanged to every command's `execute()`. It only decides which commands are reachable through `.get()`.
- **The gate is structural, not exact.** A dependency record whose nested methods are merely *bivariantly* compatible with what a command's `Deps` declares (TypeScript's own carve-out for method-shorthand members) can satisfy the check without truly being a safe substitute — the same limitation `Command`'s own `execute` already lives with.
- **A runtime guard backs the compile-time gate.** The compile-time proof above still caps at one hop, but composition itself has no depth limit at runtime — a chain that calls back into a command key already on its own call chain (`A → commands.B → commands.A`, at any depth, including a caller who bypasses the gate above) throws `LoopDetectedException` (HTTP 508) instead of recursing until the call stack overflows.

---

## Evented Registry

`eventedRegistry` is `commandRegistry`, gaining event behaviour: every event a registered command's `CommandResult` carries is automatically published through an `IEventEmitter`, and reactions registered via `.on(eventClass, handlerClass)` run — `await`ed, isolated from one another and from the command call that raised the event — before that call resolves. It's the sanctioned place to react to a domain event by running another command (`OrderConfirmed` → `SendReceiptCommand`), without wiring that by hand at every call site.

```typescript
import { eventedRegistry } from "@roastery/beans/application/evented-registry";
import type { IEventHandler } from "@roastery/beans/application/evented-registry/types";

type SendReceiptDeps = { commands: { sendReceipt: CommandRunner<typeof SendReceiptCommand> } };

class SendReceiptOnOrderConfirmed implements IEventHandler<OrderConfirmed, SendReceiptDeps> {
  public async handle(event: OrderConfirmed, deps: SendReceiptDeps): Promise<void> {
    await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
  }
}

const registry = eventedRegistry(
  { confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
  emitter, // an IEventEmitter — see below
)
  .withDependencies({ mailer })
  .on(OrderConfirmed, SendReceiptOnOrderConfirmed);

// resolves only after OrderConfirmed's reaction (and whatever it triggers) has run
const { result } = await registry.get("confirmOrder")({ total: 100 });
```

`IEventEmitter` is a minimal, structural contract — `beans` implements no event bus of its own:

```typescript
interface IEventEmitter {
  emit(event: IDomainEvent): void | Promise<void>;
}

// Adapting Node's own EventEmitter is one line — no subscription logic needed,
// since eventedRegistry never delegates .on() to the emitter (see below).
class NodeEventEmitterAdapter implements IEventEmitter {
  constructor(private readonly inner: NodeJS.EventEmitter) {}
  emit(event: IDomainEvent): void {
    this.inner.emit(event.name, event);
  }
}
```

Key rules:

- **Matching is by `name`, never `instanceof`.** `Entity.raiseEvent` spreads a raised event into a fresh plain object before buffering it, so what reaches `CommandResult.events` is never `instanceof` the class it was built from — only structurally identical to it. `.on(eventClass, handlerClass)` resolves `eventClass`'s `name` once, at registration time, by reading `defineName()` off an `Object.create(eventClass.prototype)` probe — the same construction-free pattern `Entity.fromJSON` uses to read a blueprint — which is also why a handler class's `handle()` can declare a construct signature-free event parameter (`OrderConfirmed(aggregateId, total)`, with extra payload) that `raiseEvent`'s own bare-class form could never build.
- **A reaction is a class, not a function** — `IEventHandler<Event, Deps>`, one method (`handle`), constructed fresh (`new HandlerClass()`) per matching event. Deliberately an interface, not an abstract base like `Command`: there's no blueprint to validate, so there's nothing to centralize.
- **`deps.commands` is a sibling bag, exactly like a `Command`'s own.** A handler reaches other commands the same way a sibling `Command` does — `deps.commands.sendReceipt(payload)` — gated at compile time the same way: only a handler class whose declared `Deps` the registry's dependencies (plus that one-hop `commands` bag) structurally satisfy is accepted by `.on()`. Since that call runs through the very same decorated runner `.get()` uses, whatever `sendReceipt` itself raises is, in turn, auto-published and auto-reacted-to — reactions compose.
- **A throwing handler is isolated** — it never breaks a sibling reaction on the same event, nor the `CommandResult` of the command that raised it. Failures surface through the optional `onError` hook (`eventedRegistry(spec, emitter, { onError })`); omit it and a failure still never crashes anything — it re-throws inside a microtask instead, visible as an unhandled exception through whatever the host runtime already does with those.
- **Cycles are detected at runtime, not at compile time.** A reaction whose triggered command raises the same event again — directly, or through further reactions — throws `LoopDetectedException` (HTTP 508) instead of recursing until the call stack gives out, the same runtime guard `commandRegistry`'s own sibling composition now has (TypeScript still can't prove a fixpoint of arbitrary depth, so this is a runtime backstop, not a stronger compile-time gate). When the cycle closes on an *event* specifically, the failure is isolated exactly like any other reaction error — routed through `onError`/`defaultOnError`, never rejecting the `CommandResult` of the command that raised the event.
- **`eventedRegistry` delegates command construction and execution entirely to `commandRegistry`** — reuse, not reimplementation. It builds a second, parallel `commands` bag on top, shared by `.get()` and every reaction's `deps.commands`.
- **`IEventHandler<Event, Deps>`'s `Event` is an instance type, not a class reference** — easy to get backwards for a `defineDomainEvent`-generated event, since the only thing in scope to name is the generated class itself: `const BeanPlanted = defineDomainEvent(...)` gives you a value whose natural type reference, `typeof BeanPlanted`, is the **class** shape (`DomainEventClassOf`), not the event. `IEventHandler<typeof BeanPlanted, Deps>` fails with `TS2344: Type 'DomainEventClassOf' does not satisfy the constraint 'DomainEvent'` — reach for `IEventHandler<InstanceType<typeof BeanPlanted>, Deps>` instead. A hand-written `class OrderConfirmed extends DomainEvent { ... }` doesn't have this trap — the class name already **is** the instance type, so `IEventHandler<OrderConfirmed, Deps>` is correct as written.

`eventedRegistry` also accepts a handler generated from just its `handle` function — `defineEventHandler(handle, name?)` builds the same class `implements IEventHandler<Event, Deps>` above, from one function:

```typescript
import { defineEventHandler, eventedRegistry } from "@roastery/beans/application/evented-registry";

const SendReceiptOnOrderConfirmed = defineEventHandler<OrderConfirmed, SendReceiptDeps>(
  async (event, deps) => {
    await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
  },
);

const registry = eventedRegistry(spec, emitter)
  .withDependencies({ commands })
  .on(OrderConfirmed, SendReceiptOnOrderConfirmed); // same as the hand-written class above
```

`name` is optional and purely cosmetic (stack traces, tooling) — unlike `defineDomainEvent`'s own `name` argument, nothing here is read at runtime; matching an event to its handler stays keyed off the *event* class's own name, resolved by `.on()` itself.

---

## Sensitive values

A value-object declares itself secret once, and every class that uses it inherits the fact:

```typescript
class ApiTokenVO extends ValueObject<string, typeof StringSchema> {
  protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
    return { default: "token", schema: StringSchema, sensitive: true };
  }
}
```

`PasswordVO` from the catalog already carries it. Where that lands differs by pillar, and the split is the point:

| | `toJSON()` | `toSafeJSON()` | `toString()` / `console.log` |
|---|---|---|---|
| **`Command`** | redacted | — | redacted |
| **`Entity`** | **lossless** | redacted | redacted |

A `Command` is never persisted, so nothing round-trips through its `toJSON()` — while `toJSON` is exactly what a structured logger reaches via `JSON.stringify(command)`, which is how a plaintext password ends up in a log file. An `Entity`'s `toJSON()` **is** the persistence contract and has to close the loop with `fromJSON`, so it stays lossless; reach for `toSafeJSON()` when you want the loggable view of an aggregate (it recurses, each nested entity applying its own declared keys).

```typescript
JSON.stringify(new Login({ email, password }));  // {"email":"…","password":"[redacted]"}
new Login({ email, password }).get("password");  // "StrongPass1!" — accessors are untouched

user.toJSON();      // { …, password: "StrongPass1!" }  ← what the repository saves
user.toSafeJSON();  // { …, password: "[redacted]" }    ← what the logger sees
`${user}`;          // redacted
```

### Choosing what, and how

Two sources decide **which** keys are redacted, and they answer different questions:

```typescript
// "this kind of value is always secret" — travels with the type
return { default: "token", schema: StringSchema, sensitive: true };

// "this aggregate treats this field as secret" — for when the type alone doesn't settle it
protected defineEntity(): EntityDefinition<typeof accountProperties> {
  return { properties: accountProperties, sensitive: ["token"], source: "account" };
}
```

And two decide **how**, the more specific winning:

```typescript
import { configureRedaction } from "@roastery/beans";

configureRedaction({ placeholder: "***" });                       // package-wide literal
configureRedaction({ placeholder: (_value, { name }) => `<${name}>` }); // package-wide function
configureRedaction();                                             // back to "[redacted]"

// per class, overriding the above — this is what makes partial masking possible
const MaskedEmailVO = customStringVO({
  default: "user@example.com",
  redactWith: (value) => `${String(value)[0]}***@${String(value).split("@")[1]}`,
  sensitive: true,
});
```

The placeholder function receives `(value, context)` — the real value plus the field's `{ name, source }`. Getting the value is what makes *masking* possible rather than only erasing; the parameter order mirrors the `validate` hook. A ready value and a function are told apart by `typeof`, the same discriminant `meta.default` uses for its thunk form — so a placeholder that is itself a function cannot be expressed.

---

## Exports reference

```typescript
// Root barrel: the base classes, plus blueprint and DomainEvent alongside them
import { blueprint, Command, DomainEvent, Entity, ValueObject } from "@roastery/beans";

// Symbols keying the bases' internal slots — from terroir, not from beans
import { Context, Demo, Events, Meta, Properties, Rules, Source, Storage } from "@roastery/terroir/symbols";

// Entity subpaths
import { deepEquals, entityHas, generateUUID } from "@roastery/beans/domain/entity/helpers";
import type {
  AccessorsOf,
  EntityDefinition,
  EntityHas,
  EntityHasShapeBase,
  IEntity,
  IRawEntity,
  PropertiesShapeBase,
  PropertyRule,
  RawContextOf,
  RuledBlueprint,
  RulesOf,
  SerializedEntity,
} from "@roastery/beans/domain/entity/types";
import { onCreate, onUpdate, onDelete, beforeHandle, afterHandle, onError, fromClass } from "@roastery/beans/domain/entity/decorators";
import type { BareDomainEventClass, EntityErrorEventFactory } from "@roastery/beans/domain/entity/decorators/types";

// DomainEvent subpaths — DomainEvent itself is also at the root barrel above
import { defineDomainEvent } from "@roastery/beans/domain/domain-event";
import type { DomainEventClassOf, IDomainEvent } from "@roastery/beans/domain/domain-event/types";

// ValueObject subpaths
import { metaOf } from "@roastery/beans/domain/value-object/helpers";
import type { IValueObjectContext, IValueObjectMetadata } from "@roastery/beans/domain/value-object/types";

// Collections (one barrel per kind)
import { SlugVO, UuidVO } from "@roastery/beans/domain/collections/value-objects";
import { EmailSchema, UuidSchema } from "@roastery/beans/domain/collections/schemas";
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/domain/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/domain/collections/value-objects/nullable";
import {
  customArrayVO,
  customEnumVO,
  customNumberVO,
  customObjectVO,
  customRecordVO,
  customStringVO,
  defineValueObject,
  nullableVO,
  optionalVO,
} from "@roastery/beans/domain/collections/value-objects/custom";
import type {
  ICustomValueObjectArgs,
  IDefineValueObjectArgs,
  IValueObjectHooks,
  ValueObjectClassOf,
} from "@roastery/beans/domain/collections/value-objects/custom/types";

// Command subpaths
import { collectDomainEvents, collectResult } from "@roastery/beans/application/command/helpers";
import type {
  CommandAccessorsOf,
  CommandDefinition,
  CommandPropertiesShapeBase,
  CommandResult,
  ICommand,
  RawCommandContextOf,
  SerializedCommand,
} from "@roastery/beans/application/command/types";

// CommandRegistry subpaths
import { commandRegistry } from "@roastery/beans/application/command-registry";
import type {
  AnyCommandClass,
  CommandRegistryBuilder,
  CommandRegistrySpecBase,
  CommandRunner,
  ICommandRegistry,
} from "@roastery/beans/application/command-registry/types";

// EventedRegistry subpaths
import { defineEventHandler, eventedRegistry } from "@roastery/beans/application/evented-registry";
import type {
  EventedRegistryBuilder,
  EventedRegistryOptions,
  EventHandlerClassOf,
  EventReactionErrorContext,
  EventReactionErrorHandler,
  IEventedRegistry,
  IEventEmitter,
  IEventHandler,
} from "@roastery/beans/application/evented-registry/types";

// Command's alias onto the domain collections catalog — same names, same classes
import { EmailVO, UuidVO } from "@roastery/beans/application/collections/value-objects";
import { EmailSchema, UuidSchema } from "@roastery/beans/application/collections/schemas";
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/application/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/application/collections/value-objects/nullable";
import { customStringVO, defineValueObject } from "@roastery/beans/application/collections/value-objects/custom";
import type { ValueObjectClassOf as ApplicationValueObjectClassOf } from "@roastery/beans/application/collections/value-objects/custom/types";
```

> **Naming note.** `EntityStorage` is the runtime class behind the entity's transient store, while the `Storage` **symbol** (from `@roastery/terroir/symbols`) is the protected key that holds its per-instance value. The pairing is intentional.

---

## Development

```bash
# Run tests
bun run test:unit

# Run tests with coverage
bun run test:coverage

# Build for distribution
bun run build

# Check for unused exports and dependencies
bun run knip

# Full setup (build + bun link)
bun run setup
```

## License

MIT
