# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **BREAKING** — `Mapper` (`@roastery/beans` root and `@roastery/beans/mapper`), `ParseEntityToDTOService` (`@roastery/beans/entity/services`) and `EntityUpdater` (`@roastery/beans/entity`). The v1 entity pillar is being retired in favour of the blueprint-driven `BetterEntity`, which owns its own serialisation (`toJSON` / `fromJSON`) and field updates (`set` / `setMany`). Since `Mapper.toDTO` was the only supported way to serialise an `Entity`, the remaining v1 base is **validation-only**: it still guarantees a well-formed identity and well-formed value-objects, but no longer produces a DTO
- **BREAKING** — `EntityFactory` symbol (`@roastery/beans/entity/symbols`) and the `EntityFactory`, `EntityDTOOf` and `EntityUpdaterInput` types (`@roastery/beans/entity/types`). All four existed solely to let `EntityUpdater` rebuild an entity; the abstract `[EntityFactory]` member is gone from `Entity` and `IEntity`, so subclasses no longer have to implement it

### Notes

- `BetterEntity` is **not exported** yet — it lands in the barrels once its API settles. See `docs/entity-v1-vs-v2.md` for the comparison between the two bases and the migration notes

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

- **BREAKING:** `Entity` constructor now requires the entity-type tag as a second argument (`super(data, "post")`); `[EntitySource]` is no longer `abstract` and must not be declared as a class field on subclasses. Previously the abstract field was assigned via a subclass class-field initializer, which only runs after `super()` returns — meaning any `InvalidPropertyException` raised by the value-objects built during base-class construction had no `source` set. The new shape propagates the tag *before* any validation runs, so error context is always available (closes #3)
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
