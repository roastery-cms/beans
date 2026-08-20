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

**60 ready-made Value Objects** — 20 primitives (UUID, email, slug, datetime, password, URL, and a full numeric grid of `Number`/`Integer`/`Double` × unconstrained/`Positive*`/`Negative*`), each with an `Optional*` and a `Nullable*` variant — plus their **20 TypeBox schemas** and **12 factories** (`customStringVO`, `customNumberVO`, `customDoubleVO`, `customEnumVO`, `customObjectVO`, `optionalVO`, `nullableVO`, `unionVO`, `customBinaryVO`, `defineValueObject`, …) for the constraints that do not deserve a file of their own.

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
- **No *production* repository, no Unit of Work, no ORM integration.** The `repository` pillar ships the *contract* and nothing else: `RepositoryOf` and the `ICan*` capability types are 100% type-only — no factory, no symbol, no runtime, not one byte emitted. `toJSON`/`fromJSON` are still the persistence boundary, and the adapter on the other side is still yours to write. The one implementation that does ship is `inMemoryRepositoryOf`, and it lives behind `@roastery/beans/testing` precisely so it can't be mistaken for one.
- **No DI container.** `commandRegistry` only gates access to a fixed, once-supplied dependency record at compile time — it doesn't resolve, construct, or scope dependencies for you.
- **No event bus and no dispatcher.** `raiseEvent` buffers, `pullDomainEvents` drains, `collectDomainEvents` hands the array to a `Command`'s caller. Publishing is the application's call.
- **No query side.** `Command` is the write path only.

Where those choices have consequences a caller can actually run into, they are gathered in [Known limits](#known-limits) rather than left scattered across the sections that introduce them.

## The building blocks

- **Entity** *(domain)* — Blueprint-driven base class: validated construction, `toJSON`/`fromJSON`, atomic `set`/`setMany` with automatic `updatedAt` stamping, typed accessors, nested aggregates, a transient `[Storage]` slot, a domain-event buffer, and `destroy()`. `id` (UUID v7), `createdAt` and `updatedAt` come built in.
- **ValueObject** *(domain)* — Immutable, self-validating wrapper around a value. The subclass declares only `defineMeta()`; validation runs in the constructor.
- **DomainEvent** *(domain)* — Optional abstract base for the events an `Entity` raises, plus `defineDomainEvent(name)` (a factory building a payload-less event class from just its name), three TC39 lifecycle decorators (`onCreate`, `onUpdate`, `onDelete`) that raise them automatically at a fixed point, and two TC39 method decorators (`emit`, `onError`) that raise them around an arbitrary instance method — `emit` once it has run to completion, `onError` when it throws.
- **Collections** *(domain, aliased under application)* — The Value Object / schema catalog and the custom factories described above.
- **Command** *(application)* — Blueprint-driven base for orchestrating domain behaviour behind a validated input, resolving to a `CommandResult` (`{ result, events }`). **AggregateCommand** specializes it for a single-aggregate result: `execute()` comes already implemented, the subclass writes `handle()` instead.
- **Repository** *(domain)* — Type-only ports derived from an entity's blueprint: `RepositoryOf<typeof User, Spec>` builds the contract an adapter implements, out of granular `ICan*` capabilities a use case asks for in its `Deps`. `findByEmail` exists only because the entity declares `email`. **inMemoryRepositoryOf** *(testing)* generates a working double for that same contract, from the same blueprint.
- **CommandRegistry** *(application)* — Two-phase builder (`commandRegistry(spec).withDependencies(deps)`) that gates access to a set of `Command` subclasses by their declared dependencies, entirely at compile time, and hands back a ready-to-run bound function per command via `get()`. **EventedRegistry** is the same builder, gaining event publishing and reactions (`.on(eventClass, handlerClass)`).
- **The Roastery Way** *(`@roastery/beans/way`, spans both layers)* — One import path for the low-ceremony subset above: `entityOf`, the value-object catalog, `defineDomainEvent`, `defineUseCase`, `defineEventHandler`, `commandRegistry`, `eventedRegistry`. Re-exports only — nothing new is implemented.

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

```bash
bun add @roastery/beans
```

`@roastery/terroir` (schema validation, the exception hierarchy, and the well-known slot symbols) and `slugify` are regular dependencies and come along with it — nothing else to install.

TypeScript is the one **peer** dependency, since the package is types-first: every subpath ships `.d.ts`, and `strict` plus `verbatimModuleSyntax` are what the documented patterns are written against.

```bash
bun add -d typescript
```

Importing the terroir symbols directly (`import { Storage } from "@roastery/terroir/symbols"`) works off the transitive install, but add it explicitly if your code reaches for terroir on its own:

```bash
bun add @roastery/terroir
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

## The Roastery Way

`@roastery/beans/way` is one import path for the low-ceremony subset of `beans` — everything needed to model a domain, raise and react to events, and expose behaviour as a use case, without `class X extends Entity/Command/ValueObject`, a `defineEntity`/`defineCommand`/`defineMeta` override, an `interface X extends AccessorsOf<…> {}` merge, or a terroir symbol in sight:

```typescript
import {
  blueprint, entityOf,
  defineDomainEvent, defineUseCase,
  defineEventHandler, commandRegistry, eventedRegistry,
} from "@roastery/beans/way";
import { StringVO } from "@roastery/beans/way/collections/value-objects";

// Domain
const BeanPlanted = defineDomainEvent("bean.planted");

const beanProperties = blueprint({ name: StringVO }).done();
class Bean extends entityOf(beanProperties, "bean") {
  plant() { this.raiseEvent(BeanPlanted); }
}

// Use case
class PlantBean extends defineUseCase<typeof plantBeanProperties, Deps, Bean>(plantBeanProperties, "plant-bean") {
  protected async handle({ beans }: Deps): Promise<Bean> {
    const bean = new Bean({ name: this.name });
    bean.plant();
    await beans.save(bean);
    return bean;
  }
}

// Reaction — pass the event's class directly, no InstanceType<...> needed
const LogBeanPlanted = defineEventHandler<typeof BeanPlanted, Deps>(async (event, deps) => {
  deps.logger.log(event.name);
});

// Orchestration — registers the use case, publishes what it raises, runs the reaction
const registry = eventedRegistry({ plantBean: PlantBean }, emitter)
  .withDependencies({ beans, logger })
  .on(BeanPlanted, LogBeanPlanted);

const { result } = await registry.get("plantBean")({ name: "Arabica" });
```

### Start without events

`eventedRegistry` takes a **required** `IEventEmitter`, which means the last step above asks you to decide where events go before you have anywhere to send them. That is a real step to climb on a path whose whole point is a gentle slope, so `way` exports the events-free registry too:

```typescript
import { commandRegistry } from "@roastery/beans/way";

const registry = commandRegistry({ plantBean: PlantBean }).withDependencies({ beans });

const { result, events } = await registry.get("plantBean")({ name: "Arabica" });
```

Same spec, same `.get(key)` returning a ready-to-run function, same `CommandResult` — `events` and all. **Nothing is given up by starting here**: events are still raised by the aggregate and still collected into the result; what is opt-in is *publishing* them. `eventedRegistry` is built on `commandRegistry` and delegates construction and execution to it wholesale, so moving up later is a change of registry, not of use cases — the spec, the dependencies and every `defineUseCase` stay exactly as they are.

**This is not a third layer.** `domain` and `application` are still the only two layers `beans` has — every name `@roastery/beans/way` (and its `/collections/*` subpath) exports is re-exported verbatim from its original home in one of them; nothing is reimplemented, and the barrel has no behaviour of its own. It's a curated cross-cutting index, picking only the entries whose whole design goal was already minimizing ceremony:

| Concern | From `@roastery/beans/way` | The precise form underneath |
|---|---|---|
| Declare properties + rules | `blueprint` | (same — always used either way) |
| Model an entity | `entityOf` | `class X extends Entity<Shape>` + `defineEntity()` + interface merge |
| A value | `@roastery/beans/way/collections/value-objects` (`StringVO`, `EmailVO`, `UuidVO`, …) + its `optional`/`nullable`/`custom` subpaths | same classes, same subpath either way |
| A domain event | `defineDomainEvent` | `class X extends DomainEvent` + `defineName()` |
| A use case | `defineUseCase` | `AggregateCommand`/`aggregateCommandOf`/`Command` — reach here directly once a use case needs more than one aggregate as its result |
| React to an event | `defineEventHandler` | `class X implements IEventHandler<Event, Deps>` |
| Wire it all up | `commandRegistry` (no events) or `eventedRegistry` (publishes + runs reactions) | (same — both already live in `application`; `way` only shortens the path) |

The value-object catalog lives one level deeper, at `@roastery/beans/way/collections/value-objects` (plus `/optional`, `/nullable`, `/custom`) rather than in the root of `way` itself — flattened into the same barrel as `blueprint`/`entityOf`/`defineUseCase`, its ~75 names would drown the half-dozen that actually shape how a feature is put together. Same split `domain`/`application` already draw for their own catalogs, one level down.

Reach past this barrel, into the specific subpath named on the right, the moment a use case stops fitting this shape — its result isn't a single aggregate, or the behaviour touches more than one — or an entity's definition needs to be computed rather than stated. Every one of those escape hatches is documented in full under its own section below.

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

  rename(title: string) {
    this.set("title", title); // set/setMany are protected — only reachable from here
  }
}
```

Usage:

```typescript
const post = new Post({ title: "Hello", slug: "Hello World" });

post.title;                  // "Hello" — accessor derived from the blueprint
post.slug;                   // "hello-world" — the VO's transform ran
post.id;                     // UUID v7, generated by the base
post.rename("Hi");           // validates, replaces, stamps updatedAt (set returns true if it changed)
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

> **Where the `Rules` symbol lives.** In `@roastery/terroir/symbols`, exactly like the other slots below — terroir 0.2.1 ships it, so this package declares no symbol of its own. `grep -rn 'Symbol("' src` returns nothing, and it must stay that way: symbol equality is by reference, so a local redeclaration would key a *different* slot and every rule would silently stop resolving.

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
| `clear()` | Drops every entry — what `destroy()` calls to release the transient state |

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

  rename(name: string) {
    this.set("name", name); // set/setMany are protected — only reachable from here
  }
}

const user = new User({ name: "Alan" }); // raises UserCreated
user.rename("Alan Reis");                // raises UserUpdated (only because something changed)
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

Two method decorators, from the same `@roastery/beans/domain/entity/decorators` subpath, raise an event around an **arbitrary instance method** — not a fixed lifecycle point like the three decorators above, any business operation. They cover the two outcomes a method has: `emit` raises once it has run to completion, `onError` raises only if it throws.

```typescript
import { emit, onError, fromClass } from "@roastery/beans/domain/entity/decorators";

class Order extends Entity<typeof orderProperties> {
  protected defineEntity(): EntityDefinition<typeof orderProperties> {
    return { properties: orderProperties, source: "order" };
  }

  @emit(OrderShipped)
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

order.ship();        // runs ship(), then raises OrderShipped
order.shipOrAbort(); // if it throws: raises a fresh OrderShippingFailed, then re-throws
order.shipOrFail();  // if it throws: raises OrderShippingFailed built from the error, then re-throws
```

- **`emit`** fires once the method body has returned — **never** if it throws; there is no `try`/`catch`, so a thrown exception simply propagates and the event never raises. The event is a consequence of the operation having succeeded, which is why there is no "before" counterpart: an event raised before the work happens claims a domain fact that may not turn out to be one.
- **`emit` does not publish.** `emit` is also the one member of `IEventEmitter`, one layer up, where it *does* mean "publish onto the bus". The decorator only raises into the entity's own buffer, which leaves through `pullDomainEvents` — same word, different layer, different contract.
- **`onError`** fires only if the method body throws — it wraps the call in a `try`/`catch`, raises the event, then **always re-throws the original error**. It never swallows the failure; the event is a side channel only. A different `onError` from `eventedRegistry`'s own (see [Evented Registry](#evented-registry)), which isolates a throwing *reaction* by swallowing it — this one wraps an `Entity` method and never swallows.
- **`onError` accepts either a bare class (`@onError(SomeEvent)`, the same payload-less form the other four decorators take) or a factory (`@onError((error) => ...)`, for an event that folds the caught error into its own payload).** A bare class is normalized internally through `fromClass` — exported on its own for the times that factory value is needed detached from the decorator call. Reach for the factory only when the event actually needs the error.
- **`emit` and `onError` on the same method are mutually exclusive per call**, by construction: a clean run reaches only `emit`'s raise, a throw reaches only `onError`'s. Two stacked `emit`s both fire, the one written closest to the method first — TC39 applies method decorators bottom-up, so it wraps innermost.
- Neither `await`s a returned `Promise` — an `async` method's `emit`/`onError` react once the synchronous call returns (or synchronously throws), not once the promise settles or rejects.
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

One VO per primitive, all on the self-validating base. The numeric family is a grid of three shapes (`Number`, `Integer`, `Double`) crossed with three signs (unconstrained, `Positive*`, `Negative*`); `Positive*` and `Negative*` both **include zero**, so they read as "non-negative" and "non-positive" and overlap at exactly one value:

| Class | Value type | Description |
|-------|------------|-------------|
| `BooleanVO` | `boolean` | Boolean with `truthy()`, `falsy()`, `from()` helpers |
| `DateTimeVO` | `string` | ISO 8601 datetime with `now()` factory |
| `DoubleVO` | `number` | Decimal of either sign — rounds to 2 places (`transform`) |
| `EmailVO` | `string` | Email address |
| `IntegerVO` | `number` | Whole number of either sign — truncates toward zero (`transform`) |
| `NegativeDoubleVO` | `number` | Decimal `<= 0`, rounded to 2 places |
| `NegativeIntegerVO` | `number` | Whole number `<= 0` |
| `NegativeNumberVO` | `number` | Number `<= 0` |
| `NumberVO` | `number` | Number of any sign |
| `PasswordVO` | `string` | Password with complexity rules |
| `PositiveDoubleVO` | `number` | Decimal `>= 0`, rounded to 2 places |
| `PositiveIntegerVO` | `number` | Whole number `>= 0` |
| `PositiveNumberVO` | `number` | Number `>= 0` |
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
  customBinaryVO,
  customDoubleVO,
  customEnumVO,
  customNumberVO,
  customRecordVO,
  customStringVO,
  encodeBase64,
  nullableVO,
  optionalVO,
  unionVO,
} from "@roastery/beans/domain/collections/value-objects/custom";
import { NumberSchema, StringSchema, UuidSchema } from "@roastery/beans/domain/collections/schemas";

const postProperties = {
  title: customStringVO({ options: { minLength: 4, maxLength: 120 }, default: "untitled" }),
  views: customNumberVO({ options: { minimum: 0 } }),
  authors: customArrayVO(UuidSchema, { options: { minItems: 1 }, default: () => [generateUUID()] }),
  status: customEnumVO(["draft", "published", "archived"], { default: "draft" }), // no `as const` needed
  subtitle: optionalVO(StringSchema),   // may be `undefined`, key becomes optional
  deletedAt: nullableVO(UuidSchema),    // may be `null`, key stays required
  metadata: customRecordVO(),
  document: unionVO([StringSchema, NumberSchema], { default: "" }), // string *or* number
  cover: customBinaryVO({ options: { maxBytes: 1_048_576 } }),      // base64 payload
};

new Post({ cover: encodeBase64(pngBytes) }); // bytes in, at the call site
```

| Factory | Wrapped value | Options | Default when omitted |
|---------|---------------|---------|----------------------|
| `customStringVO(args?)` | `string` | `t.StringOptions` — `minLength`, `maxLength`, `pattern`, `format` | `"string"` |
| `customNumberVO(args?)` | `number` | `t.NumberOptions` — `minimum`, `maximum`, `multipleOf` | `0` |
| `customDoubleVO(args?)` | `number` | `t.NumberOptions` plus `decimals` (default `2`) — rounds via `transform` | `0` |
| `customArrayVO(items, args?)` | `Static<items>[]` | `t.ArrayOptions` — `minItems`, `maxItems`, `uniqueItems` | `[]` |
| `customEnumVO(values, args?)` | one of `values` | `t.SchemaOptions` — `values` is a `const` tuple, no `as const` needed | `values[0]` |
| `customObjectVO(properties, args)` | the declared shape | `t.ObjectOptions` | — **required** |
| `customRecordVO(args?)` | `Record<string, unknown>` | `t.ObjectOptions` | `{}` |
| `optionalVO(schema, args?)` | `Static<schema> \| undefined` | `t.SchemaOptions` — wraps `schema` in `t.Union([schema, t.Undefined()])` | `undefined` |
| `nullableVO(schema, args?)` | `Static<schema> \| null` | `t.SchemaOptions` — wraps `schema` in `t.Union([schema, t.Null()])` | `null` |
| `unionVO(schemas, args)` | `Static<schemas[number]>` | `t.SchemaOptions` — `schemas` is a `const` tuple of two or more | — **required** |
| `customBinaryVO(args?)` | `string` (base64) | `t.StringOptions` plus `minBytes` / `maxBytes` | `""` (empty payload) |
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
- **`unionVO` requires an explicit `default` too**, for the same reason `customObjectVO` does: there is no placeholder a union of arbitrary schemas could fall back to. `optionalVO` and `nullableVO` are its two specialised forms — reach for those when the extra member is exactly `undefined` or `null`, and for `unionVO` when the alternatives are genuine domain values (`document: string | number`). A `t.Undefined()` member makes the key omittable, exactly as `optionalVO` does.
- **`customBinaryVO` stores base64, not a `Uint8Array`**, and that is a correctness decision rather than a convenience one: `toJSON()` emits each value-object's value as-is, so a `Uint8Array` would come out of `JSON.stringify` as `{"type":"Buffer","data":[…]}` and `fromJSON` would reject it — the round-trip guarantee would break on the one property that most needs to persist. Convert at the call site with the `encodeBase64` / `decodeBase64` helpers the same subpath exports (built on the Web-standard `btoa`/`atob`, so `domain/` never imports a Node builtin). `minBytes`/`maxBytes` are checked against the **exact** decoded size, not lowered into `minLength`/`maxLength` — a four-character base64 group carries one, two or three bytes, so a length-derived bound would let up to two extra bytes through.
- **`optionalVO`'s blueprint key becomes optional in the constructor payload**; `nullableVO`'s does not. `undefined` extends "not provided" and the runtime already read a missing key the same way; `null` is a value that has to be stated.
- Importing anything from this subpath registers the custom string formats, so `customStringVO({ options: { format: "slug" } })` validates against a registered format.

### Schemas

Pre-built [TypeBox](https://github.com/sinclairzx81/typebox) definitions for common types. Since terroir 0.2.0 dropped the `Schema` wrapper class, each of these **is** the runtime schema — there is no DTO/Schema pair to keep in sync, and nothing to unwrap before TypeBox's own API accepts it:

| Schema | Description |
|--------|-------------|
| `BooleanSchema` | Boolean |
| `DateTimeSchema` | ISO 8601 date-time |
| `DoubleSchema` | Decimal of either sign |
| `EmailSchema` | Email address |
| `IntegerSchema` | Whole number of either sign (`type: "integer"`) |
| `NegativeDoubleSchema` | Decimal `<= 0` |
| `NegativeIntegerSchema` | Whole number `<= 0` |
| `NegativeNumberSchema` | Number `<= 0` |
| `NumberSchema` | Number of any sign |
| `PasswordSchema` | Password (min 7 chars, uppercase, lowercase, digit, special) |
| `PositiveDoubleSchema` | Decimal `>= 0` |
| `PositiveIntegerSchema` | Whole number `>= 0` |
| `PositiveNumberSchema` | Number `>= 0` |
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

### AggregateCommand

`CreateUserCommand` above ends its `execute()` with `return collectResult(user)` — the shape of nearly every command whose result is a single aggregate. `AggregateCommand` takes that line off the subclass entirely: `execute()` comes already implemented, and the subclass writes `handle()` instead, returning the aggregate on its own rather than the `CommandResult` envelope.

```typescript
import { AggregateCommand } from "@roastery/beans/application";

class CreateUserCommand extends AggregateCommand<typeof createUserProperties, Deps, User> {
  protected defineCommand(): CommandDefinition<typeof createUserProperties> {
    return { properties: createUserProperties, source: "create-user" };
  }

  protected async handle({ secrets, users }: Deps): Promise<User> {
    const passwordId = await secrets.hash(this.password);
    const user = new User({ email: this.email, name: this.name, password: passwordId });
    await users.save(user);
    return user; // execute() wraps this into { result, events } for you
  }
}

const { result: user, events } = await new CreateUserCommand({ ... }).execute({ secrets, users });
```

- **`handle()` is `protected`** — `execute()` stays the one public verb; how it builds `CommandResult` is no longer the subclass's concern.
- **Same restriction `collectResult` already has: one aggregate.** `Result` must itself expose `pullDomainEvents` (any `Entity`). A command that needs `collectResult(result, ...rest)` — extra aggregates besides the result — or whose result isn't an aggregate at all (a `string`, `null`, …) still extends `Command` directly, implementing `execute()` as before.
- **Everything else about `Command` is unchanged** — `defineCommand`, construction, `demo()`, `fromJSON()`, sensitive-key redaction, the application-layer exceptions on invalid input — `AggregateCommand` only replaces how `execute()`'s body gets written.

**`aggregateCommandOf`** is `commandOf`'s counterpart for this case, stacking both boilerplate cuts: the blueprint binding `commandOf` already gives `Command`, plus `AggregateCommand`'s `handle()` instead of `execute()`. The subclass above shrinks to just the blueprint and `handle()`:

```typescript
import { aggregateCommandOf } from "@roastery/beans/application/command/helpers";

class CreateUserCommand extends aggregateCommandOf<typeof createUserProperties, Deps, User>(
  createUserProperties,
  "create-user",
) {
  protected async handle({ secrets, users }: Deps): Promise<User> {
    const passwordId = await secrets.hash(this.password); // typed accessor, no interface merge needed
    const user = new User({ email: this.email, name: this.name, password: passwordId });
    await users.save(user);
    return user;
  }
}
```

**`defineUseCase`** is the exact same function under a friendlier name — no DDD vocabulary required to reach for it: `class CreateUser extends defineUseCase<...>(properties, source) { protected async handle(deps) { ... } }`.

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
```

Adapting a bus to it is one method, with no subscription logic — `eventedRegistry` never delegates `.on()` to the emitter (see below). For Node's own `EventEmitter` you don't even write that one: `NodeEventEmitterAdapter` ships, and its `inner` emitter is public, which is how you subscribe.

```typescript
import { NodeEventEmitterAdapter } from "@roastery/beans/node";

const emitter = new NodeEventEmitterAdapter(); // or pass a bus you already own

emitter.inner.on("order.confirmed", (event) => console.log(event.aggregateId));

const registry = eventedRegistry(spec, emitter).withDependencies(deps);
```

It lives under `node` — its own subpath — to keep every `node:*` import out of the two layers, so `domain`/`application` stay usable from a worker or an edge function. It is production code, not a test helper: an app whose host *is* Node publishes through it. It also special-cases one name: Node **throws** `ERR_UNHANDLED_ERROR` when `"error"` is emitted with no listener, which would reject the `CommandResult` of a command that actually succeeded, so the adapter skips that call instead (with zero listeners an emit is already a no-op, so nothing is lost). Any other bus is still your own three lines:

```typescript
class KafkaEmitter implements IEventEmitter {
  constructor(private readonly producer: Producer) {}
  async emit(event: IDomainEvent): Promise<void> {
    await this.producer.send({ topic: event.name, messages: [{ value: JSON.stringify(event) }] });
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
- **`IEventHandler<Event, Deps>`'s `Event` is an instance type, not a class reference** — easy to get backwards for a `defineDomainEvent`-generated event, since the only thing in scope to name is the generated class itself: `const BeanPlanted = defineDomainEvent(...)` gives you a value whose natural type reference, `typeof BeanPlanted`, is the **class** shape (`DomainEventClassOf`), not the event. `IEventHandler<typeof BeanPlanted, Deps>` fails with `TS2344: Type 'DomainEventClassOf' does not satisfy the constraint 'DomainEvent'` — reach for `IEventHandler<InstanceType<typeof BeanPlanted>, Deps>` instead. A hand-written `class OrderConfirmed extends DomainEvent { ... }` doesn't have this trap — the class name already **is** the instance type, so `IEventHandler<OrderConfirmed, Deps>` is correct as written. This trap is specific to implementing `IEventHandler` by hand; `defineEventHandler` below sidesteps it entirely.

`eventedRegistry` also accepts a handler generated from just its `handle` function — `defineEventHandler(handle, name?)` builds the same class `implements IEventHandler<Event, Deps>` above, from one function. It has **two overloads**: pass the event's class directly (`typeof BeanPlanted`) and `defineEventHandler` computes `InstanceType<...>` for you — no `InstanceType<...>` boilerplate, and the trap above doesn't apply — or pass an already-known instance type (`OrderConfirmed`, or let it infer from `handle`'s own parameter annotation), exactly as before:

```typescript
import { defineEventHandler, eventedRegistry } from "@roastery/beans/application/evented-registry";

// Class reference — recommended for a defineDomainEvent-generated event
const LogBeanPlanted = defineEventHandler<typeof BeanPlanted>(async (event) => {
  console.log(`bean planted: ${event.aggregateId}`);
});

// Instance type — for a hand-written DomainEvent subclass
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

`Deps` defaults to `unknown`, not `void` — omit it and `handle`'s second parameter both when a reaction reads nothing from its dependencies. `unknown` specifically, not `void`: `.on()`'s compile-time gate checks that what `eventedRegistry` actually has available *extends* what the handler declares it needs, and only `unknown` (the type everything extends) is satisfied unconditionally — `void` would reject every registration, since a real dependency record never extends `void`.

---

## Repository

`beans` ships no repository *implementation* and never will — but the *contract* is derivable, and leaving it to be hand-written meant every consumer maintaining a port that agreed with the model only until someone forgot to update it. `RepositoryOf` builds that contract from the entity's own blueprint: `findByEmail` exists because `User` declares `email`, and takes a `string` because that key is an `EmailVO`. Rename the key and the method is gone at compile time.

It's a domain pillar, but its example reads best from the application side — a use case's `Deps` is where the granular `ICan*` capabilities earn their keep, so that's where this starts:

```typescript
import { defineUseCase, entityOf } from "@roastery/beans/way";
import { EmailVO, StringVO, UuidVO } from "@roastery/beans/way/collections/value-objects";
import type {
  ICanReadId,
  ICanUpdate,
  RepositoryOf,
  RepositoryPageOf,
} from "@roastery/beans/domain/repository/types";
import { ResourceNotFoundException } from "@roastery/terroir/exceptions/application";

const userProperties = { name: StringVO, email: EmailVO };
class User extends entityOf(userProperties, "user") {
  public rename(value: string): void {
    this.set("name", value);
  }
}

// What the adapter implements: one port, spec'd to what this app actually uses.
type UserRepository = RepositoryOf<
  typeof User,
  "findById" | "findByEmail" | "findMany" | "create" | "update"
>;

class PrismaUserRepository implements UserRepository {
  async findById(value: string): Promise<User | null> { /* … */ }
  async findByEmail(value: string): Promise<User | null> { /* … */ }
  async findMany(page: RepositoryPageOf<typeof User>): Promise<readonly User[]> { /* … */ }
  async create(entity: User): Promise<void> { /* … */ }
  async update(entity: User): Promise<void> { /* … */ }
}

// What the use case asks for: the two capabilities it uses, and nothing else.
// A PrismaUserRepository satisfies this; so does an in-memory fake in a test.
type RenameUserDeps = {
  users: ICanReadId<typeof User> & ICanUpdate<typeof User>;
};

const renameProperties = { userId: UuidVO, name: StringVO };

class RenameUser extends defineUseCase<typeof renameProperties, RenameUserDeps, User>(
  renameProperties,
  "rename-user",
) {
  protected async handle(deps: RenameUserDeps): Promise<User> {
    const user = await deps.users.findById(this.userId);
    if (!user) throw new ResourceNotFoundException("rename-user", this.userId);

    user.rename(this.name);
    await deps.users.update(user); // deps.users.delete(user) — does not compile

    return user;
  }
}
```

The spec can also be written grouped, which resolves to the exact same type:

```typescript
type UserRepository = RepositoryOf<typeof User, {
  read: ["findById", "findByEmail", "findMany"];
  write: ["create", "update"];
}>;
```

Key rules:

- **Nothing here runs.** The pillar is types only — no factory, no symbol, no runtime, not one byte emitted. Everything below is resolved by the compiler and gone by the time the code executes.
- **The catalog is derived from the blueprint, and only from it.** A value-object-backed key generates `findBy{Key}`, `findManyBy{Key}`, `countBy{Key}` and `existsBy{Key}`; the three identity fields (`id`, `createdAt`, `updatedAt`) come along for free, which is why `findById` needs no special case. A key backed by a **nested entity** generates nothing — a repository filters by the `UuidVO` that *references* an aggregate, not by the aggregate itself. A key whose value-object declared itself **sensitive** generates nothing either, for the other reason: a port must not offer a lookup *by* the secret it exists to hide (see [Sensitive values](#sensitive-values)).
- **Only the flat spec form gets editor completions, and that's the compiler, not a choice.** Typing `RepositoryOf<typeof User, "` lists all 24 names a two-key entity derives and drops the ones already written; `read: ["` inside the grouped form lists nothing, because TypeScript offers string-literal suggestions only for a literal in a *direct* type-argument position. Both forms reject an unknown name with `TS2344` naming the offending literal, and hovering `RepositoryReadMethodsOf<typeof User>` expands the catalog when the editor won't.
- **`ICan*` is what a use case asks for; `RepositoryOf` is what an adapter implements.** That asymmetry is the point of splitting them: `ICanReadId<typeof User> & ICanUpdate<typeof User>` in a `Deps` slot says exactly what the command is allowed to do, and the type system makes `delete` unavailable rather than merely discouraged.
- **Every collection read is bounded *and* ordered.** `findMany` and `findManyBy*` take a required `RepositoryPageOf<typeof User>` (`{ page, perPage, orderBy, direction }`), so neither an unbounded `SELECT *` nor an indeterminate page is expressible through a generated port. `beans` declares no default page size and no default order, for the same reason: a page is a slice, and a slice of an unordered set can repeat or skip a row between two calls — which the in-memory double hides and a real database does not. `findManyByIds` is the exception, and takes neither: `ids` already bounds it *and* fixes the order, since it is order-preserving (same length, same positions, `null` where there was no match — the DataLoader contract).
- **`orderBy` is narrower than the filter keys, on purpose.** It resolves to `RepositoryOrderKeysOf`, which keeps only the keys carrying a single scalar. A `StringArrayVO` or a `customObjectVO` key is perfectly filterable — equality is well defined for it — but has no total order in JavaScript or in `jsonb`, so `orderBy: "tags"` is a compile error rather than an order that differs per adapter. A key whose value-object is sensitive is absent here too, inherited from the filter set.
- **`countBy{Key}` and `existsBy{Key}` come out of the same generator.** `count()` takes no filter, so a filtered list would have no total; `countByAuthorId(id)` is what tells a paginated screen how many pages exist. `existsBy{Key}` is the check every `create` guarding a `unique` key already makes — without it the adapter emulates it with `findBy` and throws the hydrated entity away. The two differ over `id` alone: `existsById` exists (it is the primary-key check), `countById` does not (its answer is always 0 or 1). Both inherit the sensitive-key suppression, and both halves are closed against `Extras` as well — `existsByPassword` leaks the secret one bit at a time, which is exactly the shape a suppression covering only `find*` would have let through.
- **Domain objects on both ends.** Reads resolve to entity *instances*, writes take them. Crossing to whatever the storage engine wants is the adapter's job, with `toJSON`/`fromJSON` as its tools — that boundary moved nowhere. Writes resolve to `void`: handing back a different instance would silently discard the domain events buffered on the one the caller still holds.
- **Mode is available as a filter *and* as a projection.** `RepositoryOf<…, Spec, "read">` builds a port that never had a `create`; `ReaderOf<Repository>` narrows one that already exists, including a hand-written one. `WriterOf` is defined as the complement, so an unrecognised method (`archive`) counts as a write rather than disappearing from both halves.
- **The last parameter is yours, and unchecked.** `RepositoryOf<typeof User, Spec, RepositoryMode, { findByEmailDomain(domain: string, page: RepositoryPageOf<typeof User>): Promise<readonly User[]> }>` folds hand-written methods into the port verbatim. `beans` can't derive them from a blueprint, so it doesn't pretend to validate them — the generated half is proven against the model, the extra half is your word. Reaching it with the default mode means spelling `RepositoryMode` out.
- **An empty selection resolves to `never`, deliberately.** Asking for the write half of a read-only spec is a mistake, and `never` in a `Deps` slot makes it a compile error at the call site rather than a constraint that quietly switched itself off. Extras given alongside still survive on their own.
- **The generic `findBy(property, value)` is dead.** A single catch-all lookup can't be typed, which is what forced `repository.findBy("slug" as never, id as never)` on its callers. Here the property *is* the method name and its value type comes from the blueprint, so neither argument needs a cast.

### Test doubles

The same blueprint that generates the contract generates a working implementation of it, for tests:

```typescript
import { inMemoryRepositoryOf } from "@roastery/beans/testing";

// Everything the blueprint derives — findBy*/findManyBy*/countBy*/existsBy*
// per key, plus findMany, findManyByIds, count, create, update, delete
const users = inMemoryRepositoryOf(User);

// Only what this test needs; the rest is absent from the type *and* the object
const readers = inMemoryRepositoryOf(User, ["findById", "findByEmail"]);
const grouped = inMemoryRepositoryOf(User, { read: ["findById"], write: ["create"] });

// A third argument for whatever no blueprint could derive. `[]` is how you
// reach it without narrowing the second.
const flaky = inMemoryRepositoryOf(User, [], (context) => {
  let calls = 0;

  return {
    seed: (...rows: User[]) => {
      for (const row of rows) context.rows.set(row.id, row.toJSON());
    },
    clear: () => context.rows.clear(),
    async findById(id: string) {
      calls += 1;
      if (calls === 2) throw new Error("connection lost");
      return context.findById(id); // the generated one, still reachable
    },
  };
});

// Drops straight into a use case's Deps — it *is* the port, not a look-alike
const { result } = await new RenameUser({ userId, name: "alan" }).execute({ users });
```

Key rules:

- **It returns the port itself.** The type is `RepositoryOf<typeof User, Spec>` — the very type a `PrismaUserRepository` implements — so a double is substitutable for the real adapter by construction, not by a parallel interface someone keeps in sync.
- **The spec applies at runtime, not just in the type.** `["findById"]` produces an object with exactly one method, so a call outside the spec fails in the test run as well as in the compiler.
- **Empty or omitted means everything** — the opposite of `RepositoryOf`'s own empty-selection rule, which resolves to `never`. Deliberate: `inMemoryRepositoryOf(User, [], handler)` is how you reach the third argument, so empty has to read as "all of it".
- **It is faithful, not convenient.** Rows are stored as `toJSON()` and rehydrated with `fromJSON` on every read, so mutating an entity after `create` does **not** change what's stored — only `update()` does. That catches the "forgot to call update" bug instead of hiding it. The price: a read returns an equal but distinct instance with empty `[Events]`/`[Storage]`, so compare with `toEqual` or on `id` — `toBe` will not hold.
- **The handler's methods are merged over the generated ones**, and `context` is a snapshot taken beforehand — which is what lets a replacement delegate to the original, as `findById` does above. Stubbing one method to throw is a routine thing for a double to want.
- **Filtering compares with `deepEquals`.** A `StringArrayVO` key serializes to an array, and `===` would never match a freshly built one — silently, which is the worst way for a double to fail.
- **`findMany` sorts before it slices**, exactly as the port demands: it orders by the page's `orderBy`/`direction`, breaks every tie by `id`, and only then takes the window. A page is therefore repeatable rather than merely stable within one call — the failure a `Map`-backed double would have hidden and a real database would not.

### Write guarantees

The double's writes behave like a database, not like a `Map` — because a permissive store hides exactly the bugs a double exists to surface:

```typescript
const users = inMemoryRepositoryOf(User);
const alan = newUser("alan@roastery.dev");

await users.create(alan);
await users.create(alan);            // ✗ ConflictException — id already stored
await users.create(sameEmail());     // ✗ ConflictException — unique key taken
await users.update(neverPersisted);  // ✗ ResourceNotFoundException — zero rows affected
await users.delete(neverPersisted);  // ✗ ResourceNotFoundException — same
```

All four throw from `@roastery/terroir/exceptions/infra`, the layer an adapter's failures belong to. The unique keys come from [the declaration](#unique-values) — `unique: true` on a value-object, `unique: [...]` on the definition, and `id` always.

- **A nullish value never conflicts.** `NULL <> NULL` in SQL, which is the only thing that makes a unique-but-optional column expressible: an `Optional<X>VO`/`Nullable<X>VO` key collides on real values only.
- **`update` excludes the row it is writing.** Re-saving an entity whose unique value did not change passes; borrowing a sibling row's value does not. No change-tracking needed — it falls out of the exclusion, exactly as it does in a database.
- **The scan reads the store, not the generated readers.** `inMemoryRepositoryOf(User, ["create"])` has no readers at all and still refuses a duplicate.
- **The primary key is checked first**, so a duplicate `id` is reported as what it is rather than as a duplicate field.

---

## Sensitive values

A value-object declares itself secret once, and every class that uses it inherits the fact:

```typescript
class ApiTokenVO extends ValueObject<string, typeof StringSchema, true> {
  protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema, true> {
    return { default: "token", schema: StringSchema, sensitive: true };
  }
}

// or inline, through any custom-VO factory — the literal is inferred, no ceremony
const ApiKeyVO = customStringVO({ sensitive: true });
```

**The third type parameter is not optional ceremony.** `defineMeta` is `protected` and only ever invoked at runtime, so a plain `sensitive: boolean` told the compiler nothing. Carrying the literal is what makes the declaration readable at the type level — and omitting it while writing `sensitive: true` is a compile error (`TS2322`), not a flag that quietly does half its job.

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

> **The two are not interchangeable, and the difference is a security one.** Only the
> first — `sensitive: true` on the value-object — **removes that key's lookup methods
> from the repository port**. The per-aggregate `sensitive: ["token"]` list redacts and
> answers `isSensitive`, but a `findByToken` is still derived, still implementable, and
> still callable. When a key must be unreachable *as a filter*, give it a value-object
> that declares itself sensitive. See [It also shapes the repository port](#it-also-shapes-the-repository-port)
> for the table and the reason the two differ.

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

### Reading the declaration

```typescript
account.isSensitive("password");  // true  — PasswordVO declared it
account.isSensitive("token");     // true  — the definition named it
account.isSensitive("email");     // false
account.isSensitive("id");        // false — an identifier is not a secret
```

`isSensitive` mirrors `isUnique` in shape, and diverges in one place on purpose: `isUnique("id")` is always `true` (identity is the primary key), while `isSensitive("id")` is always `false` — an id is what makes a log *useful*. Like `isUnique`, it throws `InvalidPropertyException` for a key outside the blueprint rather than answering `false`, so a typo cannot read as "not a secret". And it reports the declaration only: the value stays readable through `get` and lossless through `toJSON`.

### It also shapes the repository port

A sensitive value-object **suppresses that key's lookup methods** in any `RepositoryOf` derived from a blueprint holding it:

```typescript
const userProperties = { email: EmailVO, password: PasswordVO };

type Users = RepositoryOf<typeof User, "findByEmail" | "create">;  // fine
type Bad = RepositoryOf<typeof User, "findByPassword">;            // compile error
```

Neither `findByPassword` nor `findManyByPassword` is generated, and `inMemoryRepositoryOf(User)` does not produce them at runtime either. A port that offered a lookup *by* the secret would invite exactly the query the declaration exists to prevent. Writes are untouched — `create`/`update` still persist the value; suppression is about **lookup**, not storage.

The `Extras` slot is closed too, which is what makes this a rule rather than a naming convention — a hand-written extra, or an `inMemoryRepositoryOf` handler, cannot put the name back:

```typescript
inMemoryRepositoryOf(User, [], (ctx) => ({
  findByPassword: async (v: string) => …,  // compile error
  findByNameOrEmail: async (v: string) => …, // fine — any other name still works
}));
```

**Only the value-object source suppresses.** The two declaration sources are interchangeable for redaction and for `isSensitive`, but not here:

| Declared by | Redacts | `isSensitive()` | Suppresses from the port |
|---|---|---|---|
| `sensitive: true` on a value-object's `defineMeta` | yes | `true` | **yes** |
| `sensitive: ["token"]` on `defineEntity` / `entityOf` | yes | `true` | **no** |

The per-aggregate list is a *value*, and its literal does not survive into the class type: `entityOf` takes its third argument without a `const` type parameter, and the hand-written `defineEntity` form loses it at the return annotation. Making one form suppress and not the other would break the equivalence the two are deliberately held to. Reach for a dedicated value-object when a key must disappear from the port.

---

## Unique values

Uniqueness is the one invariant an entity carries and structurally cannot check: it is a property of the *set* of stored rows, and an instance only ever sees itself. So `beans` splits it in two — the model **declares** it, the repository **enforces** it.

A value-object declares itself unique once, and every blueprint using it inherits the fact — the same shape `sensitive` has, minus the type parameter: nothing at the type level reads `unique`, so it stays a plain `boolean` and suppresses nothing from the repository port.

```typescript
class ExternalIdVO extends ValueObject<string, typeof StringSchema> {
  protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
    return { default: "external-id", schema: StringSchema, unique: true };
  }
}

// or inline, through any custom-VO factory
const BadgeCodeVO = customStringVO({ unique: true, options: { minLength: 3 } });
```

And an aggregate names the extra keys the type alone does not settle:

```typescript
class Member extends entityOf(memberProperties, "member", { unique: ["handle"] }) {}
```

`id` is **always** unique, in every entity, declared or not — identity is the primary key. `createdAt`/`updatedAt` are not: two rows may perfectly well be written in the same millisecond. The guarantee lives in the resolver both entity forms reach, so `entityOf` and a hand-written `defineEntity` behave identically.

### Reading the declaration

Two entry points, because an adapter needs the answer at two different moments:

```typescript
import { uniqueKeysOf } from "@roastery/beans/domain/entity/helpers";

uniqueKeysOf(Member);          // ["id", "externalId", "handle"] — at composition, no instance needed
member.isUnique("handle");     // true  — on the instance the port hands to create()/update()
member.isUnique("name");       // false
member.isUnique("id");         // true  — always
```

**Neither reads storage, and neither can.** They report the declaration, never whether a value is already taken — that question belongs to the adapter, which is the only side that sees the set. Two entities carrying the same unique value construct perfectly happily:

```typescript
new Member({ handle: "alan", ... });
new Member({ handle: "alan", ... }); // fine — nothing in the domain layer objects
```

`isUnique` throws `InvalidPropertyException` for a key outside the blueprint rather than answering `false`: a predicate that shrugged at a typo would report it as "not unique", which is the failure `get`'s identical guard exists to prevent.

### Enforcing it

`inMemoryRepositoryOf` is the implementation this package ships, and it behaves the way a database would — see [Write guarantees](#write-guarantees) below. A real adapter honours the same declaration, over nothing but the public surface:

```typescript
async function create(entity: Member): Promise<void> {
  const row: Record<string, unknown> = { ...entity.toJSON() };

  for (const key of uniqueKeysOf(Member)) {
    if (key === "id") continue; // the primary key has its own constraint

    if (await rowExists(key, row[key]))
      throw new ConflictException("postgres", `${key} is taken`);
  }

  await insert(row);
}
```

A `Command` never gains any of this: it is never persisted, so there is no set of rows for `unique` to mean anything against. A `unique: true` value-object used in a command blueprint is simply ignored.

---

## Exports reference

```typescript
// Root barrel: the base classes, plus blueprint and DomainEvent alongside them
import { blueprint, Command, DomainEvent, Entity, ValueObject } from "@roastery/beans";

// Redaction is a package-wide switch, so it lives at the root rather than in a pillar
import { configureRedaction, redactionConfig } from "@roastery/beans";
import type { IRedactionConfig, RedactionPlaceholder, RedactionPlaceholderFn } from "@roastery/beans";

// Application layer's own root barrel — AggregateCommand isn't reachable from the package root above
import { AggregateCommand, Command as ApplicationCommand, commandRegistry } from "@roastery/beans/application";

// Symbols keying the bases' internal slots — from terroir, not from beans
import { Context, Demo, Events, Meta, Properties, Rules, Source, Storage } from "@roastery/terroir/symbols";

// The Roastery Way: one import path for the low-ceremony subset of everything below
import {
  blueprint as wayBlueprint, entityOf, defineDomainEvent, defineUseCase,
  defineEventHandler, commandRegistry as wayCommandRegistry, eventedRegistry,
} from "@roastery/beans/way";
import type { IEventEmitter as WayIEventEmitter, RepositoryOf as WayRepositoryOf } from "@roastery/beans/way";

// The Roastery Way's own collections subpaths — the VO catalog, one level deeper
import { EmailVO, UuidVO } from "@roastery/beans/way/collections/value-objects";
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/way/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/way/collections/value-objects/nullable";
import { customStringVO, defineValueObject as wayDefineValueObject } from "@roastery/beans/way/collections/value-objects/custom";

// Entity subpaths
import { blueprint as entityBlueprint, deepEquals, entityHas, entityOf, generateUUID, uniqueKeysOf } from "@roastery/beans/domain/entity/helpers";
import type {
  AccessorsOf,
  BlueprintBuilder,
  EntityClassOf,
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
import { onCreate, onUpdate, onDelete, emit, onError, fromClass } from "@roastery/beans/domain/entity/decorators";
import type { BareDomainEventClass, EntityErrorEventFactory } from "@roastery/beans/domain/entity/decorators/types";

// DomainEvent subpaths — DomainEvent itself is also at the root barrel above
import { defineDomainEvent } from "@roastery/beans/domain/domain-event";
import type { DomainEventClassOf, IDomainEvent } from "@roastery/beans/domain/domain-event/types";

// ValueObject subpaths
import { metaOf } from "@roastery/beans/domain/value-object/helpers";
import type { IValueObjectContext, IValueObjectMetadata, ValueObjectClassLike } from "@roastery/beans/domain/value-object/types";

// Repository subpath — type-only, so `types` is the canonical path and there is no barrel above it
import type {
  ICanCount,
  ICanCreate,
  ICanDelete,
  ICanReadBy,
  ICanReadId,
  ICanReadMany,
  ICanReadManyBy,
  ICanCountBy,
  ICanExistsBy,
  ICanReadManyByIds,
  ICanUpdate,
  IEntityReader,
  IEntityRepository,
  IEntityWriter,
  ReaderOf,
  RepositoryCollectionFilterKeysOf,
  RepositoryExtraMethodsBase,
  RepositoryFilterKeysOf,
  RepositoryGroupedSpecOf,
  RepositoryMethodsOf,
  RepositoryMode,
  RepositoryOf,
  RepositoryOrderKeysOf,
  RepositoryPageOf,
  RepositoryReadMethodsOf,
  RepositorySensitiveKeysOf,
  RepositorySpecOf,
  RepositorySuppressedNamesOf,
  RepositoryWriteMethods,
  WriterOf,
} from "@roastery/beans/domain/repository/types";

// Testing — the double, kept out of the two layers on purpose
import { inMemoryRepositoryOf } from "@roastery/beans/testing";
import type {
  InMemoryRepositoryContext,
  InMemoryRepositoryHandler,
  InMemoryRepositorySpecOf,
  InMemorySpecNamesOf,
} from "@roastery/beans/testing/types";

// Node — every `node:*` import in the package lives behind this one subpath
import { NodeEventEmitterAdapter } from "@roastery/beans/node";

// Collections (one barrel per kind)
import { SlugVO, UuidVO } from "@roastery/beans/domain/collections/value-objects";
import { EmailSchema, UuidSchema } from "@roastery/beans/domain/collections/schemas";
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/domain/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/domain/collections/value-objects/nullable";
import {
  customArrayVO,
  customBinaryVO,
  customEnumVO,
  customNumberVO,
  customObjectVO,
  customRecordVO,
  customStringVO,
  decodeBase64,
  defineValueObject,
  encodeBase64,
  nullableVO,
  optionalVO,
  unionVO,
} from "@roastery/beans/domain/collections/value-objects/custom";
import type {
  IBinaryValueObjectOptions,
  ICustomValueObjectArgs,
  IDefineValueObjectArgs,
  IDoubleValueObjectArgs,
  IValueObjectHooks,
  ValueObjectClassOf,
} from "@roastery/beans/domain/collections/value-objects/custom/types";

// Command subpaths
import { aggregateCommandOf, collectDomainEvents, collectResult, commandOf, defineUseCase } from "@roastery/beans/application/command/helpers";
import type {
  AggregateCommandClassOf,
  CommandAccessorsOf,
  CommandClassOf,
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

## Known limits

Every item here is a consequence of a choice stated elsewhere in this README. They are collected in one place because that is where they are useful — spread across the section that introduced each one, they are only findable by someone who already knows what to look for.

- **Events are published before anything is committed.** `eventedRegistry` publishes a `CommandResult`'s events as soon as the command resolves. There is no Unit of Work, so a use case writing two aggregates can have the first persisted, its event published, and the second write then fail — leaving a published event describing a state that was rolled back. Today the way to avoid it is to keep a command's writes to a single aggregate, which is what `AggregateCommand` already nudges towards. A transaction boundary, and publishing after it, is the shape that fixes this properly, and it is deliberately not in 0.4.0: it would require an opinion about scope and propagation that would reach into every command's `Deps`.

- **The dependency gate is structural, not exact.** `execute` is written as method shorthand (matching `ICommand`), and TypeScript exempts method shorthand from `strictFunctionTypes`' contravariant parameter checking. A dependency record whose nested method-shaped member is only *bivariantly* compatible with what a command declares will satisfy `RegistrableKeys` without being a safe substitute. Not fixable from inside `commandRegistry` without changing `Command`/`ICommand` themselves.

- **Sibling composition is proven one hop deep.** `deps.commands` lets a command call another, and the type only proves the first hop's dependencies are satisfied — there is no fixpoint proof at arbitrary depth. The runtime is unbounded, with `LoopDetectedException` (508) as the backstop when a chain revisits a key or an event name already on it. The same one-hop limit applies to `.on()`'s `RegistrableEventHandlerClass`.

- **`findManyByIds` wins a blueprint key called `ids`.** The dispatcher tests the fixed names before falling through to the per-key generator, so an entity declaring `ids` loses `findManyByIds` to the batch loader rather than getting its own. Documented rather than engineered around; rename the key.

- **The in-memory double does not preserve reference identity.** It stores `toJSON()` and rehydrates through `fromJSON` on every read, which is what makes it catch the "forgot to call `update`" bug instead of hiding it. The price is that `toBe` will not hold across a round trip, and `[Events]`/`[Storage]` come back empty.

- **The double's ordering is JavaScript's, not a database's.** Strings compare by UTF-16 code unit, so a case or accent ordering that depends on a collation will differ from Postgres. A `customBinaryVO` key is a base64 string, so it is orderable and the order means nothing.

- **`sensitive` has two declaration sites and only one closes the port.** `sensitive: true` on a value-object suppresses that key's lookup methods; `sensitive: ["token"]` on `defineEntity`/`entityOf` redacts and answers `isSensitive` but suppresses nothing. See [It also shapes the repository port](#it-also-shapes-the-repository-port) — the literal does not survive into the class type, and diverging would break the equivalence `entityOf` and the hand-written form are deliberately kept at.

- **The accessor type merge is the one silent failure left.** In the hand-written class form, skipping `interface X extends AccessorsOf<…> {}` leaves the accessors working at runtime and invisible to the type system. `entityOf` removes the line, and with it the failure mode — everything else in the package fails loudly, with an exception naming the cause.

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

# Run the end-to-end dogfooding script (examples/user-flow.ts)
bun run example
```

Bun is pinned by **mise** (`mise.toml`), and the husky hooks go through it — so prefix any of the above with `mise exec --` if your shell isn't already using the pinned toolchain. `commit-msg` runs commitlint (Conventional Commits) and `pre-commit` runs `bun run test:unit`.

## License

MIT
