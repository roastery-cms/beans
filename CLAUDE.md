# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@roastery/beans` is a TypeScript library that ships the DDD building blocks for the Roastery CMS ecosystem: an `Entity` base class, an immutable `ValueObject` base class, and a `collections` module with ready-made DTOs / Schemas / Value Objects (UUID, slug, email, datetime, etc.). All schema validation flows through `@roastery/terroir` (a TypeBox-backed schema/exception toolkit).

The package is at version `0.1.0` (pre-1.0). Read `README.md` first — it stays in sync with the API and shows the canonical subclass patterns. `CHANGELOG.md` follows Keep a Changelog and is updated manually per release.

## Tooling

Bun is managed by **mise** (`mise.toml` pins `bun = "latest"`). Always invoke toolchain binaries through it — the husky hooks do the same:

```bash
mise exec -- bun run test:unit       # full unit suite
mise exec -- bun run test:coverage   # with coverage
mise exec -- bun test path/to/file.spec.ts        # single file
mise exec -- bun test --test-name-pattern "<re>"  # filter by it/describe name

mise exec -- bunx tsc --noEmit -p tsconfig.json   # type-check only (tsconfig has noEmit: true)
mise exec -- bunx biome check                     # lint without auto-fix
mise exec -- bun run knip                         # detect orphan exports/dependencies
mise exec -- bun run build                        # biome --fix && knip && tsup → dist/
mise exec -- bun run setup                        # build + bun link (for local linking into a consumer)
```

Test files use `.spec.ts` (the `.test.ts` suffix was renamed away in commit `877cceb`). Tests live next to the file under test.

Husky enforces:
- **commit-msg**: commitlint with `@commitlint/config-conventional` — commits must follow Conventional Commits.
- **pre-commit**: `bun run test:unit` runs on every commit.

## Architecture

Two pillars at `src/`:

- **`entity/`** — two coexisting bases. The **v1** `Entity<SchemaType>` abstract class: every subclass receives an `EntityDTO` payload (`id`, `createdAt`, `updatedAt?`) plus its own domain fields, and tags itself with an entity-type string; symbol-keyed properties (`[EntitySource]`, `[EntitySchema]`, `[EntityContext]`, `[EntityStorage]`) hold the metadata. The **v2** `BetterEntity` (`entity/better-entity.ts`), driven by a blueprint of `ValueObject`/entity classes, owning its own `toJSON`/`fromJSON`/`set`/`setMany`/`schema`.
- **`value-object/`** — likewise two bases. The **v1** `ValueObject<TValue, SchemaType>`, which does not validate eagerly — subclass factories call `validate()` after construction so derived classes can transform the value first. The **v2** `value-object/new.ts`, which validates inside its own constructor and carries `[Meta]` (schema + default).

`collections/` ships triplets — for each primitive type (boolean, datetime, slug, uuid, …) there is a `*.dto.ts` (TypeBox builder), a `*.schema.ts` (`Schema.make(XDTO)` instance), and usually a `*.value-object.ts`. `DefinedStringVO` is the one VO that intentionally reuses `StringDTO`/`StringSchema` rather than declaring its own. `collections/value-objects/new.ts` holds the v2 VOs (only `DefinedStringVO`, `DateTimeVO`, `UuidVO` so far — the rest waits on a planned `ValueObject` API redesign).

**`Mapper`, `ParseEntityToDTOService` and `EntityUpdater` were removed** along with the `[EntityFactory]` symbol and the `EntityFactory` / `EntityDTOOf` / `EntityUpdaterInput` types. They were the v1 pillar's serialisation and update paths, so **v1 `Entity` is now validation-only** — it has no way to produce a DTO. This is a deliberate transitional state: the v1 pillar is being retired in favour of `BetterEntity`. Don't reintroduce them, and don't write new domain models against v1. `docs/entity-v1-vs-v2.md` compares the two.

### Subpath exports

`package.json` `exports` uses the `./*` wildcard, so every `src/**/index.ts` becomes its own entry point under `dist/**/index.{js,cjs,d.ts}`. The granular subpaths are part of the public API:

```ts
import { Entity, ValueObject } from "@roastery/beans";
import { EntitySource, EntitySchema, EntityContext, EntityStorage } from "@roastery/beans/entity/symbols";
import { AutoUpdate } from "@roastery/beans/entity/decorators";
import { makeEntity } from "@roastery/beans/entity/factories";
import { generateUUID, slugify } from "@roastery/beans/entity/helpers";
import type { IEntity, IRawEntity } from "@roastery/beans/entity/types";
import type { IValueObjectMetadata } from "@roastery/beans/value-object/types";
```

The root `@roastery/beans` only re-exports the two pillar classes — anything else lives behind a subpath. Inside the package itself, use the `@/*` path alias (mapped to `./src/*` in `tsconfig.json`).

## Subclass patterns

**Entity subclass.** `super(data, "<entity-type>")` is mandatory — the second argument is the entity-type tag and the base constructor assigns it to `this[EntitySource]` *before* the value-objects run their validation. **Do not** declare `[EntitySource]` as a class field on the subclass — that initializer would only run after `super()` returns, leaving validation errors raised inside the base constructor with an undefined source (this was the bug fixed by commit `38abfff`, closing #3). `[EntitySchema]` is `abstract` on the base and **must** be a class field on the subclass.

**Value-object subclass.** `extends ValueObject<TValue, typeof XDTO>`, `protected override readonly schema: Schema<typeof XDTO> = XSchema`, `protected constructor(value, info)` that just delegates to `super`, and a `public static make(value, info): XVO` that does `new` + `validate()` + return. Special factories follow the same shape (e.g. `UuidVO.generate(info)`, `DateTimeVO.now(info)`, `BooleanVO.truthy/falsy/from(info)`).

### The v2 bases (`value-object/new.ts`, `entity/better-entity.ts`)

A second `ValueObject`/`Entity` pair is being built alongside the ones above. They coexist: nothing is re-exported from the barrels yet, and the two do **not** interoperate. The v2 entity contract is `IBetterEntity` (in `entity/better-entity.ts`) — named that way only to avoid colliding with the old `IEntity` in `entity/types/entity.interface.ts`, which it inherits the name of once the old `Entity` is removed.

**`better-entity.ts` carries no TSDoc on purpose** — it was stripped in one pass and is being rewritten by hand. Don't re-add doc comments there without being asked; the contracts live in this section meanwhile. The `biome-ignore` comments in the file are load-bearing: `biome check --fix` (which `bun run build` runs) classifies `noThisInStatic` as a *safe* fix and would rewrite the `this` in `fromJSON` / `demo` into `BetterEntity`, making both build the abstract base instead of the subclass.

**v2 value-object subclass.** `extends ValueObject<TValue, typeof XDTO>` from `@/value-object/new` and implement `defineMeta()`. That's the whole class — no constructor, no `super`, no payload wrapper:

```ts
class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
		return { default: "string", model: StringSchema };
	}
}

new DefinedStringVO("alan", { name: "name", source: "bean" });
DefinedStringVO.demo({ name: "name", source: "bean" });
```

Override `transform()` when the value needs normalising before validation (e.g. `slugify`). See `collections/value-objects/new.ts` for the three reference implementations.

- **`defineMeta` must be a prototype method, never a class field** — same trap, same reason as `defineEntity`: the base calls `this.defineMeta()` *inside* its constructor (it needs the `model` to validate), and a class-field initializer only runs after `super()` returns. Guarded at runtime with an `OperationFailedException` that explains the ordering, since TS can't reject a property overriding a method. It must also be **pure**: `metaOf(Class)` invokes it on an `Object.create`d probe with no constructor run. The subclass never touches `[Meta]` itself — the base fills it from `defineMeta()`.
- **`meta.default` must pass `meta.model`.** The base validates the default like any other value. Since `BetterEntity` now derives its schema from the blueprint by constructing one demo VO per property, a bad default breaks the *schema* too — not just demo-mode construction. `BetterEntity` catches that and rethrows an `OperationFailedException` naming the offending property. `StringDTO` has `minLength: 1`, so `""` is not a valid default for a `DefinedStringVO`.
- **`meta.default` may be a thunk, and should be whenever it's expensive.** `defineMeta()` runs on every construction, so a computed default would too — including on the constructions that pass a real value and throw the default away. `DateTimeVO` and `UuidVO` therefore declare `default: () => new Date().toISOString()` and `default: generateUUID`; the base only calls it in demo mode. The discriminant is `typeof === "function"`, so a VO that wrapped a *function* value would have to double-wrap it — no VO in the domain does.

**v2 entity subclass.** Declare a blueprint (`const xProperties = { field: XVO }`), extend `BetterEntity<typeof xProperties>` and implement `defineEntity()`. The base supplies `id`/`createdAt`/`updatedAt` — they must **not** appear in the blueprint. No constructor is needed: the base's is inherited, with both overloads.

```ts
const xProperties = { field: FieldVO, owner: OwnerEntity };

// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
interface X extends AccessorsOf<typeof xProperties> {}
class X extends BetterEntity<typeof xProperties> {
	protected defineEntity(): EntityDefinition<typeof xProperties> {
		return { properties: xProperties, source: "x" };
	}
}

new X({ field: "value", owner: { name: "alan" } }); // identidade gerada
X.demo();                                           // modo demo
X.fromJSON(row);                                    // hidratação validada

x.field;      // accessor tipado
x.owner.name; // encadeia, porque o accessor devolve a instância aninhada
x.id;         // getter da própria base
```

- **`defineEntity` must be a prototype method, never a class field.** Same trap as `[Meta]`: the base calls `this.defineEntity()` *inside* its constructor, and a class-field initializer only runs after `super()` returns. TS can't reject it (a property may override a method), so the base guards at runtime and throws `OperationFailedException` instead of a bare `TypeError`. It must also be **pure** — `fromJSON` invokes it on an `Object.create`d probe with no constructor run, purely to read the blueprint before validating.
- **A subclass may still declare its own constructor** and delegate to `super(...)`; `defineEntity` does not take that away. See `Tag` in `better-entity.spec.ts`.
- **`X.demo()` is the entry point without data** — a static, like `fromJSON`. `new X(true)` no longer exists: the constructor has a single signature. Each VO falls back to its `[Meta].default` and nested entities recurse into their own demo mode.

**Accessors.** Every blueprint key is readable as a plain property, and `id`/`createdAt`/`updatedAt` are concrete getters on the base — the API the old `Entity` already had.

- **The `interface X extends AccessorsOf<…> {}` line is what types them.** The getters are installed at runtime regardless (on the *prototype*, derived from the blueprint, once per class); the interface merge is how TS learns about them. Skip the line and the accessors still work but stay invisible to the type system — so don't skip it. `AccessorsOf` mirrors `get`, so an entity-valued key yields the nested **instance**.
- Read-only. `set`/`setMany` remain the only mutation path, which is what keeps the `updatedAt` stamp explicit.
- **A blueprint key may not collide with an existing member** (`schema`, `toJSON`, `get`, `set`, `id`, …). The base checks `key in prototype` before defining anything and throws `OperationFailedException` naming the key; the install is atomic, so a rejected attempt leaves the prototype untouched and the next attempt throws again. (`name` is safe — it lives on the constructor, not the prototype.)
- **Subclassing a concrete entity works.** The install walks the prototype chain, collects the keys an ancestor already covers and defines only the missing ones — so a subclass that overrides `defineEntity` with a *wider* blueprint still gets accessors for its new keys, and the collision guard doesn't fire against the ancestor's own accessors.
- `noUnsafeDeclarationMerging` is **off** in `biome.json` because of this pattern — the merge is deliberate here, not accidental. `noUnusedVariables` still fires on each interface (it doesn't count the merge as a use), so each declaration carries a one-line `biome-ignore`.
- **Identity is optional in `context`, all-or-nothing.** `RawContextOf` intersects the blueprint's raw values with a two-variant union: either none of `id`/`createdAt`/`updatedAt` appears (the base generates identity via `makeEntity`), or `id` **and** `createdAt` come together, with `updatedAt` still optional. Half a payload is a compile error, and the base's `extractIdentity` mirrors that guard at runtime for plain-JS callers, throwing `InvalidPropertyException` named after the missing key. Identity still must **not** appear in the blueprint.
- **Two hydration paths, and they differ.** `new X({ ...row })` validates VO by VO and ignores keys outside the blueprint. **`X.fromJSON(row)` is static** — it validates the whole payload against the aggregate schema first, rejecting missing **and extra** keys with `InvalidDomainDataException`, and needs no throwaway instance. Use it for payloads of untrusted origin. Both preserve the payload's identity.
- **Class fields on the subclass are fine.** `fromJSON` and `demo` build through `Reflect.construct`, which runs the subclass constructor and therefore its field initializers, so `new X(...)`, `X.fromJSON(row)` and `X.demo()` all produce the same shape. Two consequences: the subclass **constructor body also runs** on hydration and in demo mode (side effects included), and a subclass that declares its own constructor **must accept the base's context payload** — as one of its overloads is enough — and forward to `super` any argument it doesn't recognise, because `demo()` passes a module-private sentinel through that same channel. `Tag` in `better-entity.spec.ts` is the reference. Domain state still belongs in the blueprint, and transient state in `[Storage]`.
- **`[Storage]` is the sanctioned escape hatch for transient state** — the same `EntityStorage` class the v1 base uses, a per-instance `string → string` store for cached lookups and derived flags. It is `protected`, so a subclass exposes whatever facade it wants; the symbol is exported from `better-entity.ts` (the only one of the module's four that is) so `this[Storage]` can be named at all. It is initialised in all three construction paths and **starts empty on `fromJSON` / `demo`** — those are statics with no source instance, so there is nothing to carry over. It never reaches `toJSON` or `schema`: it is a separate symbol-keyed slot, not part of `[Context]`, and it cannot collide with an accessor (those only take string keys).
- **The schema belongs to the blueprint, not the instance.** It's derived from the property classes and memoized in a module-level `WeakMap` keyed by the blueprint object, so every instance of a class shares one `t.TObject` and one compiled `Schema`. Every level is emitted with `additionalProperties: false`.
- **`setMany` is the mutation primitive; `set` delegates to it.** It validates every key, then builds every value, and only then assigns — so a rejected value leaves the entity untouched. `updatedAt` is stamped **once**, and only if something actually changed.
- **`get` and `set` reject keys outside `blueprint ∪ id/createdAt/updatedAt`** with `InvalidPropertyException` (the check is `Object.hasOwn`, not `in`, so `Object.prototype` keys don't leak in). `get("updatedAt")` on an unmutated entity still returns `undefined` — a known key with no value is a different case from an unknown key.

**Aggregates.** A blueprint value may be a `ValueObject` class **or another `BetterEntity` subclass**. The discriminant is `toJSON` at the type level and `prototype instanceof BetterEntity` at runtime.

- `get("author")` returns the **nested instance** (chainable: `post.get("author").get("name")`); `set("author", raw)` takes the nested entity's *raw* payload — identity optional, same all-or-nothing rule — and rebuilds it.
- `toJSON`/`fromJSON`/`schema` all recurse.
- A validation error raised inside a nested entity carries **its own** `source` and field name (`("name", "author")`, not `("author", "post")`) — more precise, but the outer path is lost.
- Mutating a nested entity directly (`post.get("author").set(...)`) does **not** stamp the parent's `updatedAt`; only `post.set("author", raw)` does.
- **Cycles are detected, not survived.** A blueprint `A → B → A` recurses in two independent places — schema derivation and construction — and both are guarded by a set of in-progress blueprints, so you get an `OperationFailedException` naming the entity instead of a bare `RangeError`. The guard releases on the way out, so two properties of the *same* entity class in one blueprint (siblings, not a cycle) keep working. The cycle still has to be broken; the guard only makes it diagnosable.

## Conventions

- **Naming collisions are intentional.** `EntityStorage` is both a symbol (under `/entity/symbols`) and a runtime class (under `/entity`). `EntitySchema` is both a symbol (key) and a runtime `Schema` instance (the validator for the base `EntityDTO`). Both pairs are part of the documented API — alias one when you need both in scope (e.g. `import { EntityStorage as EntityStorageImpl } from "./entity-storage"`). Don't rename them.
- **`tsconfig.json` has `verbatimModuleSyntax: true` and `strict: true`.** Type-only imports must use `import type`; mixing types into value imports breaks the build.
- **Re-exports are explicit (`export { X } from "..."`), not `export *`.** Barrels in `collections/dtos`, `collections/schemas`, `collections/value-objects` are sorted alphabetically. The `entity/symbols` barrel is the one exception — its order matches the README's "Symbols" table on purpose.
- **TSDoc is mandatory** on every non-test source file. The convention is descriptions + `@param` + `@returns` + `@throws` + `@typeParam` + `@example` + `@see`, with `@module` (or `@packageDocumentation` for the root) on every barrel. When a "naming collision" symbol/value pair exists, both files cross-reference each other via `@see`.
- **Don't use `any` in tests.** Stay strict with the real types (rule from `.agent/rules/dont-use-any-type.md`).
- **`bun:test` is the only testing framework** (rule from `.agent/rules/use-bun-test.md`).

## Agent context (`.agent/`)

`.agent/` is a git submodule of the Caffeine.js Agent Guide reused here as the Roastery agent context. It contains shared rules (`.agent/rules/*.md` — language style, no-`any` in tests, `bun:test`, Biome guidance) and workflows (`.agent/workflows/*.md` — `smart-commit`, layered review workflows). Note the rules occasionally reference `@caffeine/*` packages — the equivalents in this repo are `@roastery/beans/entity/helpers` (`generateUUID`, `slugify`) and `@roastery/beans/entity/factories` (`makeEntity`).
