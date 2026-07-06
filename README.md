# @roastery/beans

DDD building blocks for the [Roastery CMS](https://github.com/roastery-cms) ecosystem — base abstractions for **Entities**, **Value Objects**, **DTOs**, **Schemas**, and **Mappers**.

[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

## Overview

**beans** provides the foundational primitives for building domain models in TypeScript:

- **Entity** — Abstract base class with built-in `id` (UUID v7), `createdAt`, and `updatedAt` fields, using Symbol-based metadata to avoid property collisions.
- **ValueObject** — Immutable, validated wrapper around a value. Throws `InvalidPropertyException` on invalid data.
- **Mapper** — Bidirectional conversion between Entities and DTOs, with schema validation on output.
- **Collections** — Ready-to-use Value Objects, DTOs, and Schemas for common types (UUID, email, slug, datetime, etc.).

## Technologies

| Tool | Purpose |
|------|---------|
| [@roastery/terroir](https://github.com/roastery-cms/terroir) | Schema validation, exception hierarchy, and TypeBox re-exports |
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

Abstract base class that every domain entity extends. Provides `id`, `createdAt`, and `updatedAt` out of the box, validated through Value Objects.

```typescript
import { Entity } from "@roastery/beans";
import { EntitySchema, EntityContext, EntityFactory } from "@roastery/beans/entity/symbols";
import type { EntityDTO } from "@roastery/beans/entity/dtos";
import { makeEntity } from "@roastery/beans/entity/factories";
import { Schema } from "@roastery/terroir/schema";
import { t } from "@roastery/terroir";
import { UuidDTO, DateTimeDTO, StringDTO, SlugDTO } from "@roastery/beans/collections";
import { DefinedStringVO, SlugVO } from "@roastery/beans/collections";

// 1. Define the schema
const PostDTO = t.Object({
  id: UuidDTO,
  createdAt: DateTimeDTO,
  updatedAt: t.Optional(DateTimeDTO),
  title: StringDTO,
  slug: SlugDTO,
});

const PostSchema = Schema.make(PostDTO);
type PostInput = { title: string; slug: string };

// 2. Implement the entity
class Post extends Entity<typeof PostDTO> {
  public readonly [EntitySchema] = PostSchema;

  private _title: DefinedStringVO;
  private _slug: SlugVO;

  public get title(): string {
    return this._title.value;
  }

  public get slug(): string {
    return this._slug.value;
  }

  public constructor(data: EntityDTO & PostInput) {
    super(data, "post");
    this._title = DefinedStringVO.make(data.title, this[EntityContext]("title"));
    this._slug = SlugVO.make(data.slug, this[EntityContext]("slug"));
  }

  public [EntityFactory](data: PostInput, initialProperties?: EntityDTO): this {
    return new Post({ ...(initialProperties ?? makeEntity()), ...data }) as this;
  }
}
```

The entity-type tag (`"post"`) is passed as the second argument to `super(...)` and stored under `this[EntitySource]` by the base class — there is no need for a `[EntitySource]` class field on the subclass. The `[EntitySchema]` field is `abstract` on `Entity`, so every subclass must bind it to its own `Schema.make(...)` instance. `[EntityFactory]` is `abstract` too — every subclass implements it so generic consumers holding an entity instance (e.g. `EntityUpdater`) can rebuild it without a separately-wired factory function.

### Symbols

| Symbol | Purpose |
|--------|---------|
| `EntitySource` | Identifies the entity origin (e.g. `"post"`, `"user"`) |
| `EntitySchema` | Holds the entity's validation `Schema` instance |
| `EntityContext` | Returns `IValueObjectMetadata` for a given property name |
| `EntityStorage` | Accessor to the entity's internal key-value store |
| `EntityFactory` | Abstract self-rebuild method: `(data, initialProperties?) => this` |

### EntityStorage

Each entity instance has a built-in key-value store (`string → string`) accessible via the `[EntityStorage]` protected getter. Useful for storing transient, non-domain state inside an entity without exposing extra public properties.

```typescript
import { EntityStorage } from "@roastery/beans/entity/symbols";

class Post extends Entity<typeof PostDTO> {
  // ...

  public addTag(tag: string): void {
    const current = this[EntityStorage].get("tags") ?? "";
    this[EntityStorage].set("tags", current ? `${current},${tag}` : tag);
  }

  public getTags(): string[] {
    return (this[EntityStorage].get("tags") ?? "").split(",").filter(Boolean);
  }
}
```

The storage API is intentionally minimal:

| Method | Description |
|--------|-------------|
| `get(key)` | Returns the value or `null` if the key does not exist |
| `set(key, value)` | Stores a value under the given key |
| `del(key)` | Removes the entry for the given key |

### AutoUpdate decorator

Automatically calls `entity.update()` after a method executes, setting `updatedAt` to the current timestamp.

```typescript
import { AutoUpdate } from "@roastery/beans/entity/decorators";

class Post extends Entity<typeof PostDTO> {
  // ...

  @AutoUpdate
  public rename(title: string): void {
    this._title = DefinedStringVO.make(title, this[EntityContext]("title"));
    this._slug = SlugVO.make(title, this[EntityContext]("slug"));
  }
}
```

### Entity factory

Generates fresh entity base data for testing:

```typescript
import { makeEntity } from "@roastery/beans/entity/factories";

const data = makeEntity();
// { id: "<uuid-v7>", createdAt: "<iso-string>", updatedAt: undefined }
```

### EntityUpdater

Applies field-level updates by round-tripping the entity through the `Mapper`: serialize to DTO, mutate the requested field, validate against the entity's schema, stamp `updatedAt`, and rebuild via the entity's own `[EntityFactory]` method. Rebuilding (instead of mutating in place) keeps every update flowing through the same value-object validation as initial construction. Successive updates accumulate — each effective call replaces the managed instance, exposed via `updater.current`.

```typescript
import { EntityUpdater } from "@roastery/beans/entity";

// Post implements `[EntityFactory]` — see the Entity section above.
const updater = new EntityUpdater(post);
const renamed = updater.run("title", "New title");
// renamed.updatedAt is freshly stamped; id/createdAt are preserved.
updater.current === renamed; // true
```

Guarantees:

- **No-op updates don't stamp.** A value that is structurally equal to the current one — or that a value-object normalises back into it (e.g. `SlugVO` turning `"Hello World"` into the current `"hello-world"`) — returns the *same* instance with `updatedAt` untouched.
- **Invalid values are rejected before `[EntityFactory]` runs.** The mutated DTO is matched against the entity's `[EntitySchema]`; a mismatch throws `InvalidDomainDataException`.
- **Identity is enforced.** `run` only accepts domain fields (`id`/`createdAt`/`updatedAt` are excluded at the type level *and* rejected at runtime), and an `[EntityFactory]` implementation that ignores its `initialProperties` argument — regenerating `id`/`createdAt` — makes `run` throw `OperationFailedException`.

> **Limitation.** Rebuilding goes through the DTO, so transient state the mapper excludes — `[EntityStorage]` contents and `__`-prefixed fields — resets to constructor defaults on every effective update.

---

## ValueObject

Immutable wrapper around a value with schema validation. All Value Objects follow the same pattern: extend `ValueObject`, implement `schema`, and expose a `static make()` factory.

```typescript
import { ValueObject } from "@roastery/beans";
import type { IValueObjectMetadata } from "@roastery/beans/value-object";
import { Schema } from "@roastery/terroir/schema";
import { StringDTO } from "@roastery/beans/collections";
import { StringSchema } from "@roastery/beans/collections";

class FullName extends ValueObject<string, typeof StringDTO> {
  protected override schema = StringSchema;

  public static make(value: string, info: IValueObjectMetadata): FullName {
    const vo = new FullName(value, info);
    vo.validate(); // throws InvalidPropertyException if invalid
    return vo;
  }
}
```

---

## Mapper

Bidirectional conversion between Entities and DTOs. `toDTO` validates the output against the entity's schema; `toDomain` splits the DTO into entity props and domain data.

```typescript
import { Mapper } from "@roastery/beans/mapper";

// Entity -> DTO (validated against schema)
const dto = Mapper.toDTO(post);
// { id: "...", createdAt: "...", title: "My Post", slug: "my-post" }

// DTO -> Entity (factory receives domain data + entity props separately)
const entity = Mapper.toDomain<typeof PostDTO>(dto, (data, entityProps) => {
  return new Post({ ...entityProps, title: data.title, slug: data.slug });
});
```

### Mapping conventions

| Convention | Behavior |
|------------|----------|
| `_property` | Stripped to `property` in DTO output |
| `__property` | Ignored entirely (internal metadata) |
| `ValueObject` instances | Extracted to `.value` |
| `Schema` instances | Replaced with `.toString()` |
| Nested `Entity` instances | Recursively converted |
| Objects with `toDTO()` | Calls `.toDTO()` recursively |
| Arrays | Each element processed recursively |
| `null` / `undefined` / primitives | Passed through unchanged |

Symbol-keyed properties (`[EntitySource]`, `[EntitySchema]`, `[EntityContext]`, `[EntityStorage]`) never appear in the produced DTO because the underlying walk only iterates string keys.

---

## Collections

### Value Objects

| Class | Value type | Description |
|-------|------------|-------------|
| `UuidVO` | `string` | UUID with `generate()` for new v7 IDs |
| `DefinedStringVO` | `string` | Non-empty string |
| `SlugVO` | `string` | Auto-slugified string |
| `UrlVO` | `string` | HTTP/HTTPS URL |
| `DateTimeVO` | `string` | ISO 8601 datetime with `now()` factory |
| `BooleanVO` | `boolean` | Boolean with `truthy()`, `falsy()`, `from()` helpers |
| `StringArrayVO` | `string[]` | Array of strings |
| `UuidArrayVO` | `string[]` | Array of UUIDs |

```typescript
import { UuidVO, SlugVO, DateTimeVO, BooleanVO } from "@roastery/beans/collections";

const id = UuidVO.generate(info);       // new UUID v7
const slug = SlugVO.make("My Post", info); // "my-post"
const now = DateTimeVO.now(info);        // current ISO timestamp
const flag = BooleanVO.from(1, info);    // true
```

### DTOs

Pre-built [TypeBox](https://github.com/sinclairzx81/typebox) definitions for common types:

| DTO | Description |
|-----|-------------|
| `StringDTO` | Non-empty string |
| `NumberDTO` | Non-negative number |
| `BooleanDTO` | Boolean |
| `DateTimeDTO` | ISO 8601 date-time |
| `UuidDTO` | UUID |
| `SlugDTO` | URL slug |
| `UrlDTO` | HTTP/HTTPS URL |
| `SimpleUrlDTO` | URL with any protocol |
| `EmailDTO` | Email address |
| `PasswordDTO` | Password (min 7 chars, uppercase, lowercase, digit, special) |
| `StringArrayDTO` | Array of strings |
| `UuidArrayDTO` | Array of UUIDs |
| `IdObjectDTO` | `{ id: UUID }` |
| `SlugObjectDTO` | `{ slug: Slug }` |

```typescript
import { EmailDTO, PasswordDTO, UuidDTO } from "@roastery/beans/collections";
```

### Schemas

Each DTO has a corresponding `Schema` instance for runtime validation:

```typescript
import { EmailSchema, PasswordSchema, UuidSchema } from "@roastery/beans/collections";

EmailSchema.match("user@example.com"); // true
EmailSchema.match("invalid");          // false
```

---

## Exports reference

```typescript
// Top-level pillars
import { Entity, Mapper, ValueObject } from "@roastery/beans";

// Entity subpaths
import { EntityUpdater } from "@roastery/beans/entity";
import { EntitySource, EntitySchema, EntityContext, EntityStorage, EntityFactory as EntityFactorySymbol } from "@roastery/beans/entity/symbols";
import { AutoUpdate } from "@roastery/beans/entity/decorators";
import { makeEntity } from "@roastery/beans/entity/factories";
import { deepEquals, generateUUID, slugify } from "@roastery/beans/entity/helpers";
import { ParseEntityToDTOService } from "@roastery/beans/entity/services";
import { EntitySchema as BaseEntitySchema } from "@roastery/beans/entity/schemas"; // runtime Schema for the base EntityDTO
import { EntityDTO } from "@roastery/beans/entity/dtos";
import type { EntityFactory, EntityUpdaterInput, IEntity, IRawEntity } from "@roastery/beans/entity/types";

// ValueObject metadata
import type { IValueObjectMetadata } from "@roastery/beans/value-object/types";

// Collections (single barrel for DTOs, Schemas and Value Objects)
import { UuidVO, SlugVO } from "@roastery/beans/collections";       // Value Objects
import { UuidDTO, EmailDTO } from "@roastery/beans/collections";    // DTOs
import { UuidSchema, EmailSchema } from "@roastery/beans/collections"; // Schemas
```

> **Naming note.** `EntitySchema` exists in two forms: the **symbol** (under `/entity/symbols`) is the property key on `Entity`, while the homonymous **runtime instance** (under `/entity/schemas`) is `Schema.make(EntityDTO)` validating the base shape. The same applies to `EntityStorage` — symbol vs runtime class — and to `EntityFactory` — symbol (under `/entity/symbols`, keys the entity's abstract self-rebuild method) vs **type** (under `/entity/types`, the free-standing factory signature `EntityUpdater` used to accept before it started calling the symbol directly). The pairing is intentional; alias one when you need both in scope.

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
