# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1 (Unreleased)] - 2026-08-17

### Added

- **`customEnumVO(values, args?)`.** A new custom value-object factory for a value restricted to a fixed set of literals. `values` is inferred through a `const` type parameter, so the caller's array does not need `as const`; the generated schema is built with TypeBox's native `t.Enum` (not a hand-rolled `t.Union` of `t.Literal`s), matching the shape any other TypeBox consumer recognises as an enum. Falls back to `values[0]` as its demo-mode default when `args.default` is omitted
- **`optionalVO(schema, args?)`.** A new custom value-object factory that wraps an existing schema so the generated VO's value may also be `undefined` — built on `t.Union([schema, t.Undefined()])`. Its default, when omitted, is `undefined`. A blueprint property backed by one is an **omittable key** in the constructor payload's type (see `UndefinedableKeys`, below)
- **`@roastery/beans/collections/value-objects/optional`.** A new subpath shipping `Optional<X>VO` for every value-object in `@roastery/beans/collections/value-objects` (`OptionalBooleanVO`, `OptionalDateTimeVO`, `OptionalEmailVO`, `OptionalNumberVO`, `OptionalPasswordVO`, `OptionalSimpleUrlVO`, `OptionalSlugVO`, `OptionalStringVO`, `OptionalStringArrayVO`, `OptionalUrlVO`, `OptionalUuidVO`, `OptionalUuidArrayVO`) — same schema and validation as the required counterpart, built with `optionalVO`, so the value may also be `undefined`. Demo-mode default is `undefined` throughout, not the required counterpart's own default. `OptionalSlugVO` keeps `SlugVO`'s `transform` (still slugifies a real value; `undefined` passes through untouched). Sugar statics on the required counterparts (`BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate`) are not mirrored
- **`nullableVO(schema, args?)`.** A new custom value-object factory, the `null` counterpart of `optionalVO` — built on `t.Union([schema, t.Null()])`, default `null` when omitted. Unlike `optionalVO`, the blueprint key it backs stays **required**: `null` never extends `undefined`, so `UndefinedableKeys` does not relax it — the caller states `null` explicitly rather than omitting the key, the usual database-`NULL` shape
- **`@roastery/beans/collections/value-objects/nullable`.** The `nullableVO` counterpart of the `optional` subpath: `Nullable<X>VO` for every value-object in the catalog (`NullableBooleanVO`, `NullableDateTimeVO`, `NullableEmailVO`, `NullableNumberVO`, `NullablePasswordVO`, `NullableSimpleUrlVO`, `NullableSlugVO`, `NullableStringVO`, `NullableStringArrayVO`, `NullableUrlVO`, `NullableUuidVO`, `NullableUuidArrayVO`). Same shape as `optional`'s catalog otherwise — demo-mode default `null`, `NullableSlugVO` keeps the `slugify` `transform`, sugar statics not mirrored

### Changed

- A blueprint property backed by an `undefined`-accepting value-object (`optionalVO`, or now any `Optional<X>VO`) is **optional in the constructor payload's type** — `subtitle?: string` rather than `subtitle: string | undefined`. No runtime change: `Entity`'s construction already read a missing key as `undefined`, same as an explicit one; this only teaches `ConstructionValuesOf`/`NestedEntityInput` (`@roastery/beans/entity/types`) what the runtime already did, via the new internal `UndefinedableKeys`. A `null`-accepting value-object (`nullableVO`/`Nullable*VO`) does **not** get this relaxation — `null` never extends `undefined`, so the key stays required

## [0.2.0] - 2026-08-15

### Added

- **`Entity`, rebuilt.** The blueprint-driven base (formerly `BetterEntity`) is now _the_ `Entity`, exported from `@roastery/beans` and `@roastery/beans/entity`. Subclasses declare a blueprint (`{ field: SomeVO }`) and a `defineEntity()` method; the base derives validated construction (with optional all-or-nothing identity), `toJSON`/`fromJSON` (the latter a strict static that validates the whole payload first), atomic `set`/`setMany` with a single automatic `updatedAt` stamp, read-only accessors typed via `AccessorsOf`, an aggregate TypeBox schema memoized per class, `demo()` fixtures, nested-entity aggregates with cycle detection, and the `[Storage]` transient store
- **`ValueObject`, rebuilt.** The self-validating base (formerly at `value-object/new.ts`) is now _the_ `ValueObject`: subclasses declare only `defineMeta()` (`{ default, schema }`) and optionally override `transform()`; validation runs in the constructor, so no instance exists unvalidated. `demo(context)` builds from the declared default, which may be a thunk for expensive values
- **Blueprint rules.** `blueprint(shape).with(rules)` (from `@roastery/beans/entity/helpers`) declares a blueprint that carries the domain's own rules: `{ default }` for a fallback belonging to the _entity_ rather than to the value-object, and `{ derive }` for a property computed from its siblings. Ruled keys become optional in the constructor payload, so the domain's defaults and derivations stop needing a hand-written constructor — which is also what keeps `fromJSON`/`demo()` intact, since a custom constructor is exactly what breaks them. Precedence is explicit value > `default` > `derive`; derivations run in blueprint order over already-normalised siblings; rules apply in `demo()` (fixtures stay coherent) and to a **nested** entity's payload, but never re-fire on `set`/`setMany`; the derived schema and `fromJSON`'s strictness are untouched. Declaring both `default` and `derive`, or naming a property outside the blueprint, is a compile error and an `InvalidEntityDefinitionException` at runtime. New public types: `PropertyRule`, `RulesOf`, `RuledBlueprint`
- The `Rules` slot symbol, declared **temporarily** in this package (`src/entity/rules.symbol.ts`) instead of `@roastery/terroir/symbols`, where it belongs. It is the single exception to the repository's "never declare a slot symbol locally" rule and exists to be deleted — `docs/terroir-rules-slot.md` tracks the move to terroir 0.2.0
- **Custom value-object factories.** `@roastery/beans/collections/value-objects/custom` ships functions that return a `ValueObject` **class** rather than an instance, so a blueprint can declare a constrained property inline instead of paying a schema plus a subclass for every domain rule: `customStringVO`, `customNumberVO`, `customArrayVO` (item schema as its first argument), `customObjectVO` (declared shape, `additionalProperties: false`), `customRecordVO` (free-form bag), and the core `defineValueObject` they all lower into — reach for that one when the schema already exists. All accept the same hooks: `default` (value or thunk), `name` (stamped onto the class), `transform(value)`, and `validate(value, context)` — a **predicate** running after the schema has accepted the transformed value, raising `InvalidPropertyException` with the owning entity's `name`/`source` when it returns `false`. Ready defaults are validated **inside the factory call**, so a placeholder the options reject (`customStringVO({ options: { minLength: 8 } })`) raises `InvalidEntityDefinitionException` at import time rather than at the first `demo()`; thunk defaults stay lazy and are validated by the base in demo mode. `customObjectVO` requires an explicit `default`, since no placeholder can satisfy an arbitrary set of required properties. Each call mints a fresh schema and a fresh class, so factories belong at module scope: calling one inside `defineEntity()`/`defineMeta()` defeats the compiled-validator and aggregate-model caches, both keyed by object identity. New public types under `@roastery/beans/collections/value-objects/custom/types`: `ValueObjectClassOf`, `IDefineValueObjectArgs`, `ICustomValueObjectArgs`, `IValueObjectHooks`
- `@roastery/beans/value-object/helpers` subpath — `metaOf`, reading a VO class's `{ default, schema }` without constructing an instance
- `@roastery/beans/entity/types` grew the blueprint type surface: `IEntity` (the rebuilt contract), `AccessorsOf`, `EntityDefinition`, `PropertiesShapeBase`, `RawContextOf`, `SerializedEntity` (plus the supporting aliases as internal one-type-per-file modules)
- Four new collection value-objects on the rebuilt base: `EmailVO`, `NumberVO`, `PasswordVO`, `SimpleUrlVO` — completing one VO per schema
- The v1 sugar statics, recreated on the rebuilt VOs: `BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate`

### Changed

- **BREAKING** — migrated to `@roastery/terroir` **0.2.0**, which removed the `Schema<T>` wrapper class. A TypeBox schema is now the runtime value itself: `Schema.make(XDTO)` is gone, `schema.match(v)` became `SchemaManager.match(XSchema, v)`, `schema.toString()` became `SchemaManager.serialize(XSchema)`, and `Schema<T>` as a type annotation collapsed to `T`. `Entity`'s per-blueprint cache now memoizes only the derived `t.TObject` — the compiled validator is cached by `SchemaManager` against the schema's object identity, so keeping the model stable is what keeps validation to one compilation per blueprint
- **BREAKING** — the slot symbols (`Context`, `Demo`, `Meta`, `Properties`, `Source`, `Storage`) now come from `@roastery/terroir/symbols`; `@roastery/beans/actions` and the `src/actions/` directory behind it are gone. Symbol equality is by reference, so hosting them in one package is what lets a consumer read the same slot `beans` wrote — a duplicate declaration failed silently, returning `undefined` and quietly breaking the type-level matches (`Instance extends { [Properties]: infer Shape }`)
- **BREAKING** — the whole collection VO catalog (`BooleanVO`, `DateTimeVO`, `DefinedStringVO`, `SlugVO`, `StringArrayVO`, `UrlVO`, `UuidArrayVO`, `UuidVO`) moved to the rebuilt base: construction is `new XVO(value, context)` instead of `XVO.make(value, info)`, and demo/default construction is `XVO.demo(context)`
- **BREAKING** — `defineMeta()` returns `{ default, schema }`; the metadata field was renamed from `model` to `schema`, matching what it now holds
- **BREAKING** — the five domain failures that used to collapse into `OperationFailedException`/`InvalidPropertyException` now raise the dedicated classes terroir 0.2.0 added for them, so consumers can discriminate on the type instead of a message substring: a blueprint cycle raises `CyclicEntityDefinitionException`; a `defineEntity`/`defineMeta` declared as a class field raises `InvalidEntityDefinitionException`; a blueprint key colliding with an existing member raises `PropertyNameCollisionException` (carrying the key in its `property` slot); a half-given identity raises `IncompleteIdentityException`; and writing to `id`/`createdAt`/`updatedAt` through `set`/`setMany` raises `ImmutablePropertyException` — previously indistinguishable from an unknown key
- `Entity.setMany` stamps `updatedAt` through `DateTimeVO.now` (same behaviour, named for what it does)
- All source TSDoc and runtime error messages are now in English

### Removed

- **BREAKING** — `Mapper` (`@roastery/beans` root and `@roastery/beans/mapper`), `ParseEntityToDTOService` (`@roastery/beans/entity/services`) and `EntityUpdater` (`@roastery/beans/entity`). Their capabilities live on the rebuilt `Entity` as `toJSON`/`fromJSON`/`set`/`setMany`
- **BREAKING** — `EntityFactory` symbol (`@roastery/beans/entity/symbols`) and the `EntityFactory`, `EntityDTOOf` and `EntityUpdaterInput` types (`@roastery/beans/entity/types`). All four existed solely to let `EntityUpdater` rebuild an entity
- **BREAKING** — the v1 `Entity` base (schema-parameterised, `super(data, source)`, hand-written getters) and the v1 `ValueObject` base (`protected schema` + `static make` + deferred `validate()`), replaced by the rebuilt pillars above
- **BREAKING** — `@roastery/beans/entity/symbols` (`EntitySource`, `EntitySchema`, `EntityContext`, `EntityStorage` symbols; superseded by `@roastery/terroir/symbols`), `@roastery/beans/entity/decorators` (`@AutoUpdate` — the stamp is automatic now), and `@roastery/beans/entity/schemas` (the runtime `EntitySchema` instance, which had no consumers)
- **BREAKING** — the `@roastery/beans/collections/dtos` subpath and the 12 `*.dto.ts` files behind it. Without the `Schema` wrapper, `XDTO` and `XSchema` were the same value under two names; the surviving name is `XSchema` (`@roastery/beans/collections/schemas`), so `collections/` ships pairs rather than triplets
- **BREAKING** — `IdObjectDTO`/`IdObjectSchema` and `SlugObjectDTO`/`SlugObjectSchema`, unused query-parameter shapes with no matching VO
- **BREAKING** — the `@roastery/beans/entity/dtos` subpath and `EntityDTO`, the TypeBox schema/type pair for `id`/`createdAt`/`updatedAt`. The rebuilt `Entity` had made it a third copy of a shape the package already held twice: the **type** is `IRawEntity` (`@roastery/beans/entity/types`), structurally identical and already public, and the **runtime schema** had no consumers at all — the base derives the identity keys itself, from `UuidSchema`/`DateTimeSchema`, when it builds a blueprint's aggregate model
- **BREAKING** — the `@roastery/beans/entity/factories` subpath and `makeEntity()`. Despite the name it never constructed an entity; it returned a plain `{ id, createdAt, updatedAt }` whose two generated values were exactly the `[Meta].default` thunks `UuidVO` and `DateTimeVO` already declare. The base now stamps a fresh identity through `UuidVO.generate` / `DateTimeVO.now`, skipping the raw string it used to generate only to re-wrap and validate — same values, one code path. Callers needing loose base data can use those two statics directly, or `X.demo()` for a whole fixture entity
- `docs/entity-v1-vs-v2.md` and `docs/better-entity-review.md` — the transitional comparison documents; the README now documents the single remaining pillar

## [0.1.3] - 2026-07-14

### Changed

- `Entity`/`IEntity`'s abstract `[EntityFactory]` method now returns `Entity<SchemaType>` / `IEntity<SchemaType>` instead of `this`. Existing subclasses that implement it as `[EntityFactory](data, initialProperties?): this` are unaffected (still a valid covariant override), but a subclass is no longer required to route through `this` at all — it can implement `[EntityFactory]` as a one-line delegate to a plain `public static build: EntityFactory<Subclass, SubclassInput>` value (e.g. `public [EntityFactory](data, initialProperties?) { return Subclass.build(data, initialProperties); }`), keeping the actual rebuild logic in an ordinary static factory instead of an instance method
- `EntityUpdater.run` asserts the rebuilt entity as `EntityType` when invoking `[EntityFactory]` — a consequence of the return type above no longer being `this`, generic code holding an `EntityType extends IEntity<t.TSchema>` only sees the widened base return from the type system, so the assertion (backed by the existing `id`/`createdAt` identity check) restores the concrete type

## [0.1.2] - 2026-07-06

### Added

- `EntityFactory` symbol (exported from `@roastery/beans/entity/symbols`) — abstract self-rebuild method every `Entity` subclass must implement as `[EntityFactory](data, initialProperties?): this`, so generic consumers holding an entity instance (e.g. `EntityUpdater`) can rebuild it without a separately-wired factory function

### Changed

- **BREAKING:** `Entity`/`IEntity` now declare `[EntityFactory]` as an abstract instance method; every concrete entity subclass must implement it (typically `return new Subclass({ ...(initialProperties ?? makeEntity()), ...data }) as this;`)
- **BREAKING:** `EntityUpdater`'s constructor no longer takes an `entityFactory` second argument (`new EntityUpdater(entity)` instead of `new EntityUpdater(entity, entityFactory)`) — it now calls the entity's own `[EntityFactory]` method to rebuild after each mutation

## [0.1.1] - 2026-07-05

### Added

- `EntityUpdater` (exported from `@roastery/beans/entity`) — stateful field-level updater that round-trips the entity through the `Mapper` (serialize → mutate → validate against `[EntitySchema]` → stamp `updatedAt` via `DateTimeVO.now` → rebuild through an `EntityFactory`). Accumulates updates (`updater.current` exposes the latest instance), skips the `updatedAt` stamp for structurally-equal or VO-normalized no-op values, rejects base-prop updates (`id`/`createdAt`/`updatedAt`) at the type level and at runtime, and throws `OperationFailedException` when the factory fails to preserve the entity's identity
- `EntityFactory` type (exported from `@roastery/beans/entity/types`) — factory signature `(data, initialProperties?) => Entity` used by `EntityUpdater` and by `Mapper.toDomain`-style reconstruction
- `EntityDTOOf` and `EntityUpdaterInput` types (exported from `@roastery/beans/entity/types`) — resolve an entity type's plain-object DTO shape and its domain-content slice; `EntityUpdaterInput` is the input shape `EntityUpdater` requires of its factory
- `deepEquals` (exported from `@roastery/beans/entity/helpers`) — structural equality over JSON-shaped DTO values, used by `EntityUpdater` to detect and skip no-op updates

### Changed

- Biome schema reference in `biome.json` bumped from `2.4.11` to `2.4.16`

## [0.1.0] - 2026-04-27

### Added

- Full TSDoc coverage across all 65 source files — class/function descriptions, `@param`, `@returns`, `@throws`, `@typeParam`, `@example`, `@see`, plus `@module` / `@packageDocumentation` headers on every barrel
- `Mapper.toDomain` `Input` generic parameter with default `Omit<t.Static<SchemaType>, keyof IRawEntity>` so callers can constrain the domain-content slice independently from the full schema, and the DTO parameter is now typed as `Input & IRawEntity` (closes #6)
- `EntityStorage.get` overload accepting a fallback callback that narrows the return type to non-nullable `string` (closes #4)
- `EntityStorage.set` returns the stored value to support inline chaining (closes #4)
- `framework` and `ddd` keywords in `package.json`

### Changed

- **BREAKING:** `Entity` constructor now requires the entity-type tag as a second argument (`super(data, "post")`); `[EntitySource]` is no longer `abstract` and must not be declared as a class field on subclasses. Previously the abstract field was assigned via a subclass class-field initializer, which only runs after `super()` returns — meaning any `InvalidPropertyException` raised by the value-objects built during base-class construction had no `source` set. The new shape propagates the tag _before_ any validation runs, so error context is always available (closes #3)
- `Entity._id` and `Entity._createdAt` are now `private readonly` (write-once, only assigned by the constructor)
- All eight collection value objects (`BooleanVO`, `DateTimeVO`, `DefinedStringVO`, `SlugVO`, `StringArrayVO`, `UrlVO`, `UuidArrayVO`, `UuidVO`) declare `schema` as `protected override readonly`, matching the `protected abstract readonly` contract on the `ValueObject` base
- `Mapper.toDomain` implementation no longer casts the DTO through `as IRawEntity & Record<string, unknown>`; the destructuring leans on the new `Input & IRawEntity` parameter type, so the domain-content cast collapses to a single `content as Input`
- Re-exports in `collections/schemas/index.ts` and `collections/value-objects/index.ts` are now sorted alphabetically
- `entity-storage.test.ts` renamed to `entity-storage.spec.ts` to match the rest of the suite

### Fixed

- `InvalidPropertyException` raised during `Entity` base-class construction now carries the correct `source`. Previously the source was `undefined` for the very first validation pass because the abstract class-field had not yet been initialised (closes #3)
- `IdObjectDTO.examples` mistakenly used `{ uuid: "..." }` despite the schema shape being `{ id: UuidDTO }` — corrected to `{ id: "..." }` and the description tightened to drop the redundant "by its UUID" wording
- README imports updated to the actual subpath layout (`/entity/symbols`, `/entity/decorators`, `/entity/factories`, `/entity/helpers`, `/entity/services`, `/entity/dtos`, `/entity/types`, `/value-object/types`); the previous version listed every helper as living at `@roastery/beans/entity`, which only re-exports the `Entity` class
- README `Post` example constructor now passes `entitySource` to `super(...)` and drops the redundant `[EntitySource]` class field, matching the real `Entity` signature
- README "Mapping conventions" table expanded with the missing rules: `Schema → toString()`, nested `Entity` recursion, and the `null` / `undefined` / primitives passthrough

## [0.0.4] - 2026-03-26

### Changed

- `[EntityStorage]` is now a `protected readonly` symbol-keyed property directly on `Entity`, replacing the previous `private _storage` field + getter pattern

## [0.0.3] - 2026-03-25

### Added

- `EntityStorage` class — internal key-value store (`string → string`) for entities
- `EntityStorage` symbol — protected `[EntityStorage]` accessor on the `Entity` class for subclasses to consume the internal storage
- Export of `EntityStorage` symbol via `src/entity/symbols/index.ts`
