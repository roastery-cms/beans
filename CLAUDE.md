# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@roastery/beans` is a TypeScript library that ships the DDD building blocks for the Roastery CMS ecosystem: an `Entity` base class, an immutable `ValueObject` base class, a `Mapper` for Entity↔DTO conversion, and a `collections` module with ready-made DTOs / Schemas / Value Objects (UUID, slug, email, datetime, etc.). All schema validation flows through `@roastery/terroir` (a TypeBox-backed schema/exception toolkit).

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

Three pillars at `src/`:

- **`entity/`** — the `Entity<SchemaType>` abstract class and its supporting modules. Every subclass receives an `EntityDTO` payload (`id`, `createdAt`, `updatedAt?`) plus its own domain fields, and tags itself with an entity-type string. Symbol-keyed properties (`[EntitySource]`, `[EntitySchema]`, `[EntityContext]`, `[EntityStorage]`) hold the metadata; using symbols (instead of string keys) keeps these out of DTO output because the mapper iterates only string keys.
- **`value-object/`** — the `ValueObject<TValue, SchemaType>` abstract class. Concrete VOs go under `collections/value-objects/`. The base does not validate eagerly — subclass factories call `validate()` after construction so derived classes can transform the value first (e.g. `SlugVO` runs `slugify()` before validating).
- **`mapper/`** — a frozen-as-const namespace with `toDTO(entity)` (entity → validated DTO) and `toDomain<S, Input>(dto, factory)` (DTO → entity, via caller-supplied factory). The asymmetry is deliberate: flattening is generic, but reconstructing requires subclass-specific wiring. `toDomain`'s `Input` generic defaults to `Omit<t.Static<S>, keyof IRawEntity>` so the entity props (`id`, `createdAt`, `updatedAt`) are split off automatically.

`collections/` ships triplets — for each primitive type (boolean, datetime, slug, uuid, …) there is a `*.dto.ts` (TypeBox builder), a `*.schema.ts` (`Schema.make(XDTO)` instance), and usually a `*.value-object.ts`. `DefinedStringVO` is the one VO that intentionally reuses `StringDTO`/`StringSchema` rather than declaring its own.

`entity/services/parse-entity-to-dto.service.ts` is what `Mapper.toDTO` delegates to. The recursion rules (mirrored in `README.md` "Mapping conventions"): strip leading `_` from property names, drop `__`-prefixed properties, unwrap `ValueObject` to `.value`, recurse into nested `Entity`, call `.toDTO()` on objects that expose it, recurse into arrays. **Cycle detection is intentionally absent** — break cycles before invoking the mapper.

### Subpath exports

`package.json` `exports` uses the `./*` wildcard, so every `src/**/index.ts` becomes its own entry point under `dist/**/index.{js,cjs,d.ts}`. The granular subpaths are part of the public API:

```ts
import { Entity, Mapper, ValueObject } from "@roastery/beans";
import { EntitySource, EntitySchema, EntityContext, EntityStorage } from "@roastery/beans/entity/symbols";
import { AutoUpdate } from "@roastery/beans/entity/decorators";
import { makeEntity } from "@roastery/beans/entity/factories";
import { generateUUID, slugify } from "@roastery/beans/entity/helpers";
import type { IEntity, IRawEntity } from "@roastery/beans/entity/types";
import type { IValueObjectMetadata } from "@roastery/beans/value-object/types";
```

The root `@roastery/beans` only re-exports the three pillar classes — anything else lives behind a subpath. Inside the package itself, use the `@/*` path alias (mapped to `./src/*` in `tsconfig.json`).

## Subclass patterns

**Entity subclass.** `super(data, "<entity-type>")` is mandatory — the second argument is the entity-type tag and the base constructor assigns it to `this[EntitySource]` *before* the value-objects run their validation. **Do not** declare `[EntitySource]` as a class field on the subclass — that initializer would only run after `super()` returns, leaving validation errors raised inside the base constructor with an undefined source (this was the bug fixed by commit `38abfff`, closing #3). `[EntitySchema]` is `abstract` on the base and **must** be a class field on the subclass.

**Value-object subclass.** `extends ValueObject<TValue, typeof XDTO>`, `protected override readonly schema: Schema<typeof XDTO> = XSchema`, `protected constructor(value, info)` that just delegates to `super`, and a `public static make(value, info): XVO` that does `new` + `validate()` + return. Special factories follow the same shape (e.g. `UuidVO.generate(info)`, `DateTimeVO.now(info)`, `BooleanVO.truthy/falsy/from(info)`).

## Conventions

- **Naming collisions are intentional.** `EntityStorage` is both a symbol (under `/entity/symbols`) and a runtime class (under `/entity`). `EntitySchema` is both a symbol (key) and a runtime `Schema` instance (the validator for the base `EntityDTO`). Both pairs are part of the documented API — alias one when you need both in scope (e.g. `import { EntityStorage as EntityStorageImpl } from "./entity-storage"`). Don't rename them.
- **`tsconfig.json` has `verbatimModuleSyntax: true` and `strict: true`.** Type-only imports must use `import type`; mixing types into value imports breaks the build.
- **Re-exports are explicit (`export { X } from "..."`), not `export *`.** Barrels in `collections/dtos`, `collections/schemas`, `collections/value-objects` are sorted alphabetically. The `entity/symbols` barrel is the one exception — its order matches the README's "Symbols" table on purpose.
- **TSDoc is mandatory** on every non-test source file. The convention is descriptions + `@param` + `@returns` + `@throws` + `@typeParam` + `@example` + `@see`, with `@module` (or `@packageDocumentation` for the root) on every barrel. When a "naming collision" symbol/value pair exists, both files cross-reference each other via `@see`.
- **Don't use `any` in tests.** Stay strict with the real types (rule from `.agent/rules/dont-use-any-type.md`).
- **`bun:test` is the only testing framework** (rule from `.agent/rules/use-bun-test.md`).

## Agent context (`.agent/`)

`.agent/` is a git submodule of the Caffeine.js Agent Guide reused here as the Roastery agent context. It contains shared rules (`.agent/rules/*.md` — language style, no-`any` in tests, `bun:test`, Biome guidance) and workflows (`.agent/workflows/*.md` — `smart-commit`, layered review workflows). Note the rules occasionally reference `@caffeine/*` packages — the equivalents in this repo are `@roastery/beans/entity/helpers` (`generateUUID`, `slugify`) and `@roastery/beans/entity/factories` (`makeEntity`).
