# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@roastery/beans` is a TypeScript library that ships the DDD building blocks for the Roastery CMS ecosystem: a blueprint-driven `Entity` base class, a self-validating immutable `ValueObject` base class, and a `collections` module with ready-made Schema / Value Object pairs (UUID, slug, email, datetime, etc.). All schema validation flows through `@roastery/terroir` (a TypeBox-backed schema/exception toolkit), currently on **0.2.1**, which also owns the well-known symbols keying the bases' slots.

The package is pre-1.0. Read `README.md` first — it stays in sync with the API and shows the canonical subclass patterns. `CHANGELOG.md` follows Keep a Changelog and is updated manually per release.

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

Test files use `.spec.ts` and live next to the file under test.

Husky enforces:
- **commit-msg**: commitlint with `@commitlint/config-conventional` — commits must follow Conventional Commits.
- **pre-commit**: `bun run test:unit` runs on every commit.

## Architecture

Two top-level pillars at `src/`, plus a smaller third one:

- **`entity/`** — the `Entity` base (`entity/entity.ts`), plus `helpers/` and `types/`. The `EntityStorage` runtime class (`entity/entity-storage.ts`) backs the `[Storage]` slot.
- **`value-object/`** — the `ValueObject` base (`value-object/value-object.ts`), plus `helpers/` (`metaOf`, and the internal `readMeta`/`resolveDefault`) and `types/` (`IValueObjectContext`, `IValueObjectMetadata`, `ValueObjectClassLike`).
- **`domain-event/`** — `DomainEvent` (`domain-event/domain-event.ts`), the optional abstract base for writing concrete domain-event classes, plus `types/` (`IDomainEvent`, the contract `Entity.raiseEvent` builds). Its own pillar, not nested under `entity/`, even though `Entity` is its only consumer today — `IDomainEvent` is a plain data contract, not entity-specific machinery.

**The slot symbols are not declared here.** `Context`, `Demo`, `Events`, `Meta`, `Properties`, `Rules`, `Source` and `Storage` come from `@roastery/terroir/symbols` — terroir 0.2.0 moved the first six there so the whole ecosystem shares one declaration site, and 0.2.1 added `Events`. Symbol equality is by reference, so re-declaring any of them locally would key a *different* slot: reads return `undefined` and the type-level matches (`Instance extends { [Properties]: infer Shape }`) silently stop resolving. `src/actions/` existed for this and is gone, as are `src/entity/rules.symbol.ts` and `src/events.symbol.ts` — `Rules` and then `Events` were the local holdouts, in turn, and terroir now ships both.

`collections/` ships pairs — for each primitive there is a `*.schema.ts` (the TypeBox schema itself) and a `*.value-object.ts`, 12 of each. There is no `*.dto.ts` layer: since terroir dropped the `Schema` wrapper, the schema *is* the runtime value, so DTO and Schema collapsed into one name. `StringVO` is the one VO that intentionally reuses `StringSchema` rather than declaring its own — and `StringSchema` carries **no** `minLength`, so `StringVO` accepts `""`. A property that must not be empty needs a VO whose schema says so; naming it `name` in a blueprint does not. `collections/value-objects/custom/` is the third piece: factories that build a constrained VO class on the fly, for the rules that don't deserve a file of their own.

`collections/value-objects/optional/` is the fourth piece: `Optional<X>VO` for every one of the 12 (`OptionalStringVO`, `OptionalUuidVO`, …), each just `optionalVO(XSchema, { name: "Optional<X>VO" })` — same schema, `undefined` added to the accepted values, demo-mode default `undefined` instead of the required VO's own. `OptionalSlugVO` is the one exception that carries its own `transform`, mirroring `SlugVO`'s `slugify` call (guarded for `undefined`) — `optionalVO` wraps a *schema*, not a VO's `transform` override, so that has to be re-declared explicitly. None of the required VOs' sugar statics (`BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate`) are mirrored here.

`collections/value-objects/nullable/` is the fifth piece, and `optional/`'s mirror image: `Nullable<X>VO` for every one of the 12, each just `nullableVO(XSchema, { name: "Nullable<X>VO" })` — same schema, `null` added to the accepted values, demo-mode default `null`. `NullableSlugVO` re-declares the `transform` the same way `OptionalSlugVO` does, guarded for `null` instead of `undefined`. **The two subpaths are not interchangeable**: `null` never extends `undefined`, so `UndefinedableKeys` never picks up a `Nullable<X>VO`-backed key — the blueprint key stays required, and the caller must pass `null` explicitly (`new Post({ deletedAt: null })`, never `new Post({})`). `optional/` is for "may not have been provided"; `nullable/` is for "provided, and explicitly empty" (the usual shape of a `NULL` database column).

**Code layout conventions.** One thing per file: each type alias in its own `types/<kebab>.type.ts`, each interface in `types/<kebab>.interface.ts`, each helper function in its own `helpers/<kebab>.ts`. Barrels re-export only the public surface — internal types/helpers are imported by direct path (`@/entity/types/raw-value-of.type`, `@/entity/helpers/read-definition`), which knip counts as usage. The construction machinery that references the `Entity` class itself (`isEntityClass`, `isEntity`, `rawOf`, `modelFor` + its `models`/`deriving` caches, `buildProperty`, `buildContext` + `constructing`, `buildBaseContext`, `cycleError`) **stays inside `entity/entity.ts`** — extracting it would create circular imports.

Only three of the eight entity helpers are public: `entity/helpers/index.ts` exports `blueprint`, `deepEquals` and `generateUUID`. `applyRuleDefaults`, `extractIdentity`, `installAccessors`, `readDefinition`/`definitionOf` and `rulesOf` are internal — `entity.ts` is their only consumer and imports each by direct path. Adding one to the barrel widens the published API, so leave them out unless that is the intent.

### Subpath exports

`package.json` `exports` uses the `./*` wildcard, so every `src/**/index.ts` becomes its own entry point under `dist/**/index.{js,cjs,d.ts}`. The granular subpaths are part of the public API:

```ts
import { blueprint, DomainEvent, Entity, ValueObject } from "@roastery/beans";
import { Context, Demo, Meta, Properties, Rules, Source, Storage } from "@roastery/terroir/symbols";
import { deepEquals, generateUUID } from "@roastery/beans/entity/helpers";
import type { AccessorsOf, EntityDefinition, IEntity, IRawEntity } from "@roastery/beans/entity/types";
import type { IDomainEvent } from "@roastery/beans/domain-event/types";
import { metaOf } from "@roastery/beans/value-object/helpers";
import type { IValueObjectContext, IValueObjectMetadata } from "@roastery/beans/value-object/types";
import { SlugVO, UuidVO } from "@roastery/beans/collections/value-objects";
import { customStringVO, defineValueObject } from "@roastery/beans/collections/value-objects/custom";
import { OptionalStringVO, OptionalUuidVO } from "@roastery/beans/collections/value-objects/optional";
import { NullableStringVO, NullableUuidVO } from "@roastery/beans/collections/value-objects/nullable";
```

The root `@roastery/beans` re-exports `Entity`, `ValueObject`, `blueprint` and `DomainEvent` — the two base classes plus the two things most subclasses declare right alongside them — and nothing else; everything more specific lives behind a subpath. `entity/index.ts` mirrors that same pairing at its own level (`Entity` + `blueprint`), which is why `blueprint`'s `export` line lives in three places (`entity/helpers/index.ts`, its original home; `entity/index.ts`; and the root `index.ts`) despite one-thing-per-file governing everywhere else — a barrel re-exporting an already-declared symbol isn't a second declaration. There is **no** `@roastery/beans/collections` barrel — the real subpaths are `/collections/schemas`, `/collections/value-objects`, `/collections/value-objects/custom`, `/collections/value-objects/custom/types`, `/collections/value-objects/optional` and `/collections/value-objects/nullable`. Inside the package itself, use the `@/*` path alias (mapped to `./src/*` in `tsconfig.json`).

## Subclass patterns

### ValueObject subclass

`extends ValueObject<TValue, typeof XSchema>` and implement `defineMeta()`. That's the whole class — no constructor, no `super`, no payload wrapper:

```ts
class StringVO extends ValueObject<string, typeof StringSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return { default: "string", schema: StringSchema };
	}
}

new StringVO("alan", { name: "name", source: "bean" });
StringVO.demo({ name: "name", source: "bean" });
```

Override `transform()` when the value needs normalising before validation (e.g. `SlugVO` slugifies). Sugar statics are plain additions (`BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate` — the last two are aliases of `demo`).

- **`defineMeta` must be a prototype method, never a class field** — the base calls `this.defineMeta()` *inside* its constructor (it needs the `schema` to validate), and a class-field initializer only runs after `super()` returns. Guarded at runtime with an `InvalidEntityDefinitionException` that explains the ordering, since TS can't reject a property overriding a method. It must also be **pure**: `metaOf(Class)` invokes it on an `Object.create`d probe with no constructor run. The subclass never touches `[Meta]` itself — the base fills it from `defineMeta()`.
- **`meta.default` must pass `meta.schema`.** The base validates the default like any other value. Since `Entity` derives its schema from the blueprint, a bad default also breaks demo-mode construction of every entity using the class. `SlugSchema` has `minLength: 1`, so `""` is not a valid default for a `SlugVO` — while `StringSchema` constrains nothing beyond the type, which is why the specs reach for a slug whenever they need a value the schema refuses.
- **`meta.default` may be a thunk, and should be whenever it's expensive.** `defineMeta()` runs on every construction, so a computed default would too — including on the constructions that pass a real value and throw the default away. `DateTimeVO` and `UuidVO` declare `default: () => new Date().toISOString()` and `default: generateUUID`; the base only calls it in demo mode. The discriminant is `typeof === "function"`, so a VO that wrapped a *function* value would have to double-wrap it — no VO in the domain does.
- **`transform` does not run over defaults** — declare them already in canonical form (`SlugVO`'s default is `"slug"`, not something to slugify).

### Entity subclass

Declare a blueprint (`const xProperties = { field: XVO }`), extend `Entity<typeof xProperties>` and implement `defineEntity()`. The base supplies `id`/`createdAt`/`updatedAt` — they must **not** appear in the blueprint. No constructor is needed: the base's is inherited.

```ts
const xProperties = { field: FieldVO, owner: OwnerEntity };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface X extends AccessorsOf<typeof xProperties> {}
class X extends Entity<typeof xProperties> {
	protected defineEntity(): EntityDefinition<typeof xProperties> {
		return { properties: xProperties, source: "x" };
	}
}

new X({ field: "value", owner: { name: "alan" } }); // fresh identity
X.demo();                                           // demo mode
X.fromJSON(row);                                    // strict hydration

x.field;      // typed accessor
x.owner.name; // chains — the accessor returns the nested instance
x.id;         // getter from the base
```

- **`defineEntity` must be a prototype method, never a class field.** Same trap as `defineMeta`: the base calls `this.defineEntity()` *inside* its constructor, and a class-field initializer only runs after `super()` returns. Guarded at runtime with `InvalidEntityDefinitionException`. It must also be **pure** — `fromJSON` invokes it on an `Object.create`d probe with no constructor run, purely to read the blueprint before validating.
- **A subclass may still declare its own constructor** and delegate to `super(...)`; it must accept the base's context payload — as one of its overloads is enough — and forward to `super` any argument it doesn't recognise, because `demo()` passes a module-private sentinel through that same channel. See `Tag` in `entity.spec.ts`.
- **`X.demo()` is the entry point without data** — a static, like `fromJSON`. Each VO falls back to its `[Meta].default` and nested entities recurse into their own demo mode.

**Accessors.** Every blueprint key is readable as a plain property, and `id`/`createdAt`/`updatedAt` are concrete getters on the base.

- **The `interface X extends AccessorsOf<…> {}` line is what types them.** The getters are installed at runtime regardless (on the *prototype*, derived from the blueprint, once per class); the interface merge is how TS learns about them. Skip the line and the accessors still work but stay invisible to the type system — so don't skip it. `AccessorsOf` mirrors `get`, so an entity-valued key yields the nested **instance**. This is the **one silent failure mode** left: everything else fails loudly with an exception naming the cause.
- Read-only. `set`/`setMany` remain the only mutation path, which is what keeps the `updatedAt` stamp explicit.
- **A blueprint key may not collide with an existing member** (`schema`, `toJSON`, `get`, `set`, `id`, …). The base checks `key in prototype` before defining anything and throws `PropertyNameCollisionException` carrying the key in its `property` slot; the install is atomic, so a rejected attempt leaves the prototype untouched and the next attempt throws again. (`name` is safe — it lives on the constructor, not the prototype.)
- **Subclassing a concrete entity works.** The install walks the prototype chain, collects the keys an ancestor already covers and defines only the missing ones — so a subclass that overrides `defineEntity` with a *wider* blueprint still gets accessors for its new keys, and the collision guard doesn't fire against the ancestor's own accessors.
- `noUnsafeDeclarationMerging` is **off** in `biome.json` because of this pattern — the merge is deliberate here, not accidental. `noUnusedVariables` still fires on each interface (it doesn't count the merge as a use), so each declaration carries a one-line `biome-ignore`.
- **Identity is optional in the payload, all-or-nothing.** `RawContextOf` intersects the blueprint's raw values with a two-variant union: either none of `id`/`createdAt`/`updatedAt` appears (the base stamps a fresh identity via `UuidVO.generate` / `DateTimeVO.now`, in `buildBaseContext`), or `id` **and** `createdAt` come together, with `updatedAt` still optional. Half a payload is a compile error, and `extractIdentity` (in `entity/helpers`) mirrors that guard at runtime for plain-JS callers, throwing `IncompleteIdentityException`. That class has no `property` slot — the identity is one unit, and it is the whole unit that is incomplete — so the missing key survives only in the message.
- **Two hydration paths, and they differ.** `new X({ ...row })` validates VO by VO and ignores keys outside the blueprint. **`X.fromJSON(row)` is static** — it validates the whole payload against the aggregate schema first, rejecting missing **and extra** keys with `InvalidDomainDataException`, and needs no throwaway instance. Use it for payloads of untrusted origin. Both preserve the payload's identity.
- **Class fields on the subclass are fine.** `fromJSON` and `demo` build through `Reflect.construct`, which runs the subclass constructor and therefore its field initializers, so all three construction paths produce the same shape. Two consequences: the subclass **constructor body also runs** on hydration and in demo mode (side effects included), and domain state still belongs in the blueprint, transient state in `[Storage]`.
- **`[Storage]` is the sanctioned escape hatch for transient state** — the `EntityStorage` class, a per-instance `string → string` store for cached lookups and derived flags. It is `protected`, so a subclass exposes whatever facade it wants; the `Storage` symbol comes from `@roastery/terroir/symbols`. It is initialised in all three construction paths and **starts empty on `fromJSON` / `demo`** — those are statics with no source instance, so there is nothing to carry over. It never reaches `toJSON` or `schema`, and it cannot collide with an accessor (those only take string keys).
- **`raiseEvent`/`pullDomainEvents` are the domain-event buffer**, backed by the `[Events]` slot (per-instance `IDomainEvent[]`, `protected` like `[Storage]`, initialised the same way and **starts empty on `fromJSON`/`demo`**). `raiseEvent` is `protected` — a subclass calls it from its own business methods, never automatically from `set`/`setMany`. It stamps `occurredAt`/`aggregateId` itself and does not accept them from the caller, so an event can never misreport which entity (or when) it came from; `beans` is not event-sourced, so there is no replay path that would need to override either. Only the aggregate root should call it — an event raised inside a nested entity stays in that entity's own buffer, since `pullDomainEvents` (`public`) does not recurse through `[Context]` the way `toJSON` does. `beans` ships no dispatcher: `pullDomainEvents` only drains the buffer (`Array.prototype.splice(0)`), what happens with the result is the consuming application's call. `raiseEvent`'s parameter type is `Event | (new (aggregateId: string) => Event)` — a payload-less `DomainEvent` subclass (one that doesn't override the inherited `constructor(aggregateId: string)`) can be passed **bare, as the class itself**, and `raiseEvent` does `new event(this.id)` when `typeof event === "function"`. A subclass whose constructor needs more than `aggregateId` (an overridden constructor with extra required params) is not assignable to `new (aggregateId: string) => Event`, so TypeScript routes it to the "already built" branch instead and rejects the bare-class form at compile time — no runtime check needed to enforce that, the constructor signature itself is the guard.
- **`DomainEvent` (`domain-event/domain-event.ts`, its own pillar) is optional sugar over `IDomainEvent`, not a second contract.** A subclass declares only `defineName()` and passes `aggregateId` through `super()`; the base stamps `occurredAt` itself. It follows the exact `defineMeta`/`defineEntity` shape: `defineName` **must be a prototype method, never a class field** (same `InvalidEntityDefinitionException` guard, checked inline in the constructor rather than through a dedicated `read-*` helper, since nothing else needs to probe it without constructing). Because `raiseEvent` always overwrites `occurredAt`/`aggregateId` on the way into the buffer regardless of what the passed object already carries, a `DomainEvent` instance and a plain `{ name, ...payload }` object behave identically there — reach for `DomainEvent` when an event has payload fields of its own and a class reads better than the literal, not because `raiseEvent` requires it. `entity.ts` imports `IDomainEvent` cross-pillar, via `@/domain-event/types` — the first (and so far only) place the `@/*` alias crosses from `entity/` into a sibling pillar.
- **The schema belongs to the blueprint, not the instance.** It's derived from the property classes and memoized in a module-level `WeakMap` keyed by the blueprint object, so every instance of a class shares one `t.TObject`. Every level is emitted with `additionalProperties: false`. Keeping that model stable is also what keeps validation cheap: `SchemaManager.match` caches the compiled validator against the schema's *object identity*, so the model is compiled once per blueprint rather than once per call.
- **`setMany` is the mutation primitive; `set` delegates to it.** It validates every key, then builds every value, and only then assigns — so a rejected value leaves the entity untouched. `updatedAt` is stamped **once** (via `DateTimeVO.now`), and only if something actually changed.
- **`get` and `set` reject unknown keys** with `InvalidPropertyException` (the check is `Object.hasOwn`, not `in`, so `Object.prototype` keys don't leak in). `get("updatedAt")` on an unmutated entity still returns `undefined` — a known key with no value is a different case from an unknown key.
- **Writing to `id`/`createdAt`/`updatedAt` is a different failure from writing to an unknown key**, and `setMany` says so: identity fields raise `ImmutablePropertyException` (they are readable, never writable), unknown keys raise `InvalidPropertyException`. `get` accepts the identity fields, so it only ever raises the latter.

**Blueprint rules.** `blueprint(shape).with(rules)` (in `entity/helpers/blueprint.ts`) attaches per-property domain rules — `{ default }` (a fallback belonging to the entity, outranking the VO's own) or `{ derive }` (computed from siblings). The two are mutually exclusive.

```ts
const postTagProperties = blueprint({ name: TagName, slug: TagSlug, hidden: TagVisibility })
	.with({ slug: { derive: (raw) => raw.name }, hidden: { default: false } });

new PostTag({ name: "Alan Reis" }); // slug: "alan-reis", hidden: false
```

- **The rules live under the `Rules` symbol key on the blueprint object itself** (from `@roastery/terroir/symbols`; `rulesOf` reads the slot, `blueprint().with()` writes it). That is what makes the feature cheap: `Object.keys`/`Object.entries` skip symbols, so `modelFor`, `installAccessors`, `toJSON` and every other traversal keep seeing exactly the domain properties. The type-level counterpart is `DomainKeys<Shape>` (`Extract<keyof Shape, string>`) — **every mapped type over a blueprint must go through it**, or the slot leaks as an accessor/schema field/serialized key. Six already do (`AccessorsOf`, `ContextOf`, `EntitySchemaOf`, `InputValuesOf`, `SerializedValuesOf`, `ReadableKey`).
- **Ruled keys are optional in the constructor payload** (`ConstructionValuesOf` inside `RawContextOf`). For a plain blueprint `RuledKeys` is `never`, so everything collapses to the previous behaviour.
- **So are `undefined`-accepting keys**, through the same `ConstructionValuesOf`, via `UndefinedableKeys` (`entity/types/undefinedable-keys.type.ts`): any key whose VO class's `value` type includes `undefined` (built with `optionalVO`, or one of the `Optional*VO` catalog classes). No rule is required — the runtime already read a missing key the same as an explicit `undefined` (`buildContext` indexes `raw[key]`), so this is purely a type-level catch-up, not a behaviour change. `UndefinedableKeys` reads `["prototype"]["value"]` directly rather than going through `InputValueOf`, deliberately skipping the nested-entity branch: recursing through `InputValueOf` there would re-enter this same type for a self-referencing blueprint (`{ child: Node }`) and TypeScript rejects that as a circular mapped type. `null` (from `nullableVO`/`Nullable*VO`) is **not** picked up by this — `null` never extends `undefined`, so a nullable key stays required; only `undefined`-accepting keys become omittable.
- **Resolution is explicit value > `default` > `derive`**, all inside `buildContext`: `applyRuleDefaults` fills the `default` rules over the payload first, the main loop builds every non-derived key, then a second pass resolves the derivations. They run in **blueprint order** and read siblings already built and normalised (a `SlugVO` sibling reads back slugified). A derivation reading a key derived later gets `undefined` and fails on that property's validation.
- **"Omitted" means `undefined`, not falsy.** `applyRuleDefaults` tests `values[key] !== undefined`, so an explicit `false` or `0` or `""` counts as a supplied value and the rule's `default` does not fire — which is exactly what a `{ hidden: { default: false } }` rule needs in order to be overridable with `true`.
- **Rules apply in `demo()`** — that is what makes fixtures coherent instead of a bag of unrelated defaults. Keys with no rule still go through the VO's `.demo()`, so `transform` still never runs over a VO default.
- **Rules never re-fire on `set`/`setMany`.** Mutation takes explicit values; `tag.set("name", …)` leaves a derived `slug` alone.
- **The schema and `fromJSON` are untouched** — rules act on input only, `toJSON()` always emits every property, so every key stays required and hydration stays strict.
- Two phases because a literal cannot reference its own `typeof`; `blueprint(shape)` alone returns **only** `{ with }`, so a forgotten `.with(...)` is a type error rather than a `with` key leaking into the properties.
- **Nesting keeps the rules.** A nested entity's payload accepts the same omissions its own blueprint allows (`InputValueOf` → `NestedEntityInput`). That type reads the nested blueprint through an inline `infer` rather than `PropertiesOfClass`, and funnels the optionality through `Optionalize` — both deliberate: the serialized types recurse through aggregates, and the straightforward spelling blows past TS's instantiation depth at `set("author", raw)`.
- **Domain vocabulary is free by subclassing a VO**: `class TagName extends StringVO {}` inherits `defineMeta`, `transform`, `demo` and the `instanceof` — including, note, the parent's *lack* of constraints. Override `defineMeta` when the alias needs a stricter schema.

### Custom VO factories

`collections/value-objects/custom/` ships functions that **return a VO class**, so a blueprint can carry a constraint inline instead of a schema plus a subclass per rule. Subpath: `@roastery/beans/collections/value-objects/custom` (types one level deeper, under `/types`). `defineValueObject({ schema, default, name?, transform?, validate? })` is the core; `customStringVO`, `customNumberVO`, `customArrayVO(items, args?)`, `customObjectVO(properties, args)`, `customRecordVO`, `customEnumVO(values, args?)`, `optionalVO(schema, args?)` and `nullableVO(schema, args?)` are thin wrappers that only build the schema and delegate.

This works because the blueprint machinery is **entirely structural** — `isEntityClass` is `prototype instanceof Entity`, `SchemaOf` infers through `ValueObject<unknown, infer SchemaType>`, `RawValueOf` reads `prototype["value"]`, and nothing in `src/` ever touches `Class.name`. A class expression satisfies `AnyValueObjectClass` and lands in the VO branch on its own.

- **Every factory must annotate its return type with `ValueObjectClassOf<V, S>`.** The class is declared inside the function body, and `tsconfig.build.json` sets `declaration: true` while `bun run build` runs `tsup --dts` — an inferred return type fails with **TS4060** (`Return type of exported function has or is using private name`) and emits no `.d.ts`. The `as ValueObjectClassOf<…>` on the return covers `demo` alone: the base declares it generic over `this`, so assignability instantiates `Self` at its constraint and the return collapses to `{ value: unknown }`.
- **Call the factories at module scope, once.** Each call mints a fresh schema object *and* a fresh class. `SchemaManager` caches compiled validators by schema identity and `modelFor` memoizes by blueprint object, so a factory called inside `defineEntity()`/`defineMeta()` recompiles per construction — silently, only slower. Corollary: two calls with identical arguments produce unrelated classes, so `instanceof` does not connect them.
- **The schema and the `meta` literal live in the closure, never in the class body.** `defineMeta()` runs on every construction; building either inside would allocate per instance and hand `SchemaManager` a new cache key each time.
- **Ready defaults are validated eagerly, inside the factory call**, raising `InvalidEntityDefinitionException` (with `name` as its `source`, falling back to `"value-object"`). That turns a latent `demo()`/blueprint failure into a module-load failure. **Thunk defaults are skipped** on purpose — checking one would evaluate it, defeating the laziness — and the base still validates them at demo time.
- **`customObjectVO` requires `default`**; there is no placeholder for an arbitrary set of required properties, and `Value.Create` is out of reach (terroir re-exports only the root `@sinclair/typebox` module, not `/value`). The others fall back to `"string"` / `0` / `[]` / `{}` / `values[0]`, each then subject to the eager check.
- **`customEnumVO` infers its literal tuple through a `const` type parameter**, so the caller's array of values does not need `as const`. It builds the schema with TypeBox's own `t.Enum`, not a hand-rolled `t.Union` of `t.Literal`s — the record's keys (stringified values) are thrown away, since `t.Enum` only reads the record's *values*.
- **`optionalVO` wraps an existing schema in `t.Union([schema, t.Undefined()])`**, so the generated VO's value may be `undefined`. This is the only sanctioned way to get an `undefined`-accepting VO: the base `ValueObject`'s `ValueType` was never constrained against it, but nothing validated it either until the schema itself says so. Its default, when omitted, is `undefined` — not a placeholder that then needs validating. A blueprint property backed by one **is an omittable key** in the constructor payload's type (`UndefinedableKeys` in `entity/types`, see below) — `Entity`'s runtime already read a missing key the same as an explicit `undefined`, so the type only had to catch up.
- **`nullableVO` wraps an existing schema in `t.Union([schema, t.Null()])`**, so the generated VO's value may be `null`. Its default, when omitted, is `null`. Unlike `optionalVO`, a blueprint property backed by one is **never** an omittable key — `null` doesn't extend `undefined`, so `UndefinedableKeys` doesn't pick it up, and the caller must state `null` explicitly (`new Post({ deletedAt: null })`, not `new Post({})`). Reach for `optionalVO` when a property may not have been provided, `nullableVO` when it was provided and is explicitly empty — the usual `undefined` (request body) vs. `null` (database column) split.
- **`validate` is a predicate**, not a `void` hook: it runs *after* `super.validate()`, so it only sees transformed, schema-valid values, and returning `false` raises `InvalidPropertyException` with the context's `name`/`source`. Throwing from inside works too and propagates untouched.
- **The barrel carries `import "@roastery/terroir/schema/formats"`** — without it, `customStringVO({ options: { format: "slug" } })` would validate against an unregistered format. Only `collections/schemas/index.ts` did this before.
- **`options` stays nested** in the args (`{ options: { minLength: 4 } }`), not spread. TypeBox's `SchemaOptions` already declares a `default` field — the JSON Schema annotation — which means something else entirely from the demo-mode fallback.

**Aggregates.** A blueprint value may be a `ValueObject` class **or another `Entity` subclass**. The discriminant is `toJSON` at the type level and `prototype instanceof Entity` at runtime.

- `get("author")` returns the **nested instance** (chainable: `post.get("author").get("name")`); `set("author", raw)` takes the nested entity's *raw* payload — identity optional, same all-or-nothing rule — and rebuilds it.
- `toJSON`/`fromJSON`/`schema` all recurse.
- A validation error raised inside a nested entity carries **its own** `source` and field name (`("name", "author")`, not `("author", "post")`) — more precise, but the outer path is lost.
- Mutating a nested entity directly (`post.get("author").set(...)`) does **not** stamp the parent's `updatedAt`; only `post.set("author", raw)` does.
- **Cycles are detected, not survived.** A blueprint `A → B → A` recurses in two independent places — schema derivation and construction — and both are guarded by a set of in-progress blueprints, so you get a `CyclicEntityDefinitionException` naming the entity instead of a bare `RangeError`. The guard releases on the way out, so two properties of the *same* entity class in one blueprint (siblings, not a cycle) keep working. The cycle still has to be broken; the guard only makes it diagnosable.

## Conventions

- **The `biome-ignore` comments on `demo`/`fromJSON` are load-bearing**: `biome check --fix` (which `bun run build` runs) classifies `noThisInStatic` as a *safe* fix and would rewrite the `this` in those statics into the abstract base class, making them build the base instead of the subclass. Keep the directives verbatim (`entity/entity.ts`, `value-object/value-object.ts`).
- **Never declare a slot symbol locally.** All eight terroir-owned slots (`Context`, `Demo`, `Events`, `Meta`, `Properties`, `Rules`, `Source`, `Storage`) come from `@roastery/terroir/symbols`. `Properties` and `Source` are used as type-level keys (`Instance extends { [Properties]: infer Shape }`), so a second symbol with the same description — or a module-local redeclaration — would make those conditional types silently stop matching, and every slot read return `undefined`. `grep -rn 'Symbol("' src` must return **zero** hits: `src/events.symbol.ts` (the temporary home of `Events`, mirroring `src/entity/rules.symbol.ts` before it) is gone now that terroir 0.2.1 ships the symbol. Do not reintroduce one.
- **A symbol used as a computed key is a *value* import, not a type import.** `Rules` appears in both positions and the distinction is load-bearing: `ruled-blueprint.type.ts` and `ruled-keys.type.ts` only ever mention it inside a type (`{ readonly [Rules]: Rule }`) and correctly use `import type`, while `blueprint.ts` and `rules-of.ts` *read and write* the slot at runtime (`properties[Rules]`, `Object.assign({}, properties, { [Rules]: rules })`) and need a plain `import`. Because `verbatimModuleSyntax: true` erases `import type` outright, getting this backwards does not fail at the import — it throws `ReferenceError: Rules is not defined` from inside `buildContext`, so *every* entity construction breaks at once while the module graph loads fine.
- **One intentional naming pair**: `EntityStorage` is the runtime class (`entity/entity-storage.ts` — internal, not re-exported from any barrel), `Storage` is the symbol keying its per-instance slot (`@roastery/terroir/symbols`).
- **Reach for the specific domain exception, not the generic one.** terroir 0.2.0 ships `ImmutablePropertyException`, `PropertyNameCollisionException`, `IncompleteIdentityException`, `InvalidEntityDefinitionException` and `CyclicEntityDefinitionException` — added because *this* repo was collapsing all five cases into `OperationFailedException`/`InvalidPropertyException`. Tests assert the class (and the `property`/`source` slots), never a message substring. Every exception also takes a trailing `ErrorOptions`, so a wrapped failure keeps its `cause`.
- **`tsconfig.json` has `verbatimModuleSyntax: true` and `strict: true`.** Type-only imports must use `import type`; mixing types into value imports breaks the build.
- **Re-exports are explicit (`export { X } from "..."`), not `export *`.** Barrels are sorted alphabetically.
- **TSDoc is mandatory** on every non-test source file, in **English** — descriptions + `@param` + `@returns` + `@throws` + `@typeParam` + `@example` + `@see`, with `@module` (or `@packageDocumentation` for the root) on every barrel. Runtime error messages are English too.
- **Don't use `any` in tests.** Stay strict with the real types (rule from `.agent/rules/dont-use-any-type.md`).
- **`bun:test` is the only testing framework** (rule from `.agent/rules/use-bun-test.md`).

## Agent context (`.agent/`)

`.agent/` is a git submodule of the Caffeine.js Agent Guide reused here as the Roastery agent context. It contains shared rules (`.agent/rules/*.md` — language style, no-`any` in tests, `bun:test`, Biome guidance) and workflows (`.agent/workflows/*.md` — `smart-commit`, layered review workflows). Note the rules occasionally reference `@caffeine/*` packages — the closest equivalent in this repo is `@roastery/beans/entity/helpers` (`blueprint`, `deepEquals`, `generateUUID`). The rules also mention entity factories, which this package no longer ships: fresh identity comes from the `Entity` base itself, and fixtures from `X.demo()`.
