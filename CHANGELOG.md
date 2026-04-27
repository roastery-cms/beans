# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
