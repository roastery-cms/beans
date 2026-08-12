/**
 * @packageDocumentation
 *
 * `@roastery/beans` — DDD building blocks for the Roastery CMS ecosystem.
 *
 * The package exposes these import surfaces; pick the one that matches the
 * layer you are working at:
 *
 * - `"@roastery/beans"` (this barrel) — the two top-level pillars
 *   ({@link Entity}, {@link ValueObject}). Almost every consumer starts here.
 * - `"@roastery/beans/entity"` — the entity pillar ({@link Entity}). Subpaths:
 *   `/entity/dtos`, `/entity/schemas`, `/entity/decorators` (`@AutoUpdate`),
 *   `/entity/factories` (`makeEntity`), `/entity/helpers`
 *   (`deepEquals`, `generateUUID`, `slugify`), `/entity/symbols` (the four
 *   symbols), `/entity/types` (`IEntity`, `IRawEntity`).
 * - `"@roastery/beans/value-object"` — the abstract {@link ValueObject} base
 *   (with `IValueObjectContext` one level deeper at `/value-object/types`).
 * - `"@roastery/beans/collections"` — ready-to-use DTOs (`/collections/dtos`),
 *   Schemas (`/collections/schemas`) and Value Objects (`/collections/value-objects`)
 *   for the most common scalar/array/object shapes.
 *
 * The intentionally thin root barrel keeps `import { Entity } from "@roastery/beans"`
 * unambiguous; everything more specific lives behind a subpath.
 *
 * **Migration note.** `Mapper`, `ParseEntityToDTOService` and `EntityUpdater`
 * were removed: the v1 entity pillar is being retired in favour of
 * `BetterEntity` (`src/entity/better-entity.ts`), which owns its own
 * serialisation (`toJSON` / `fromJSON`) and field updates (`set` / `setMany`).
 * `BetterEntity` is not exported yet — it lands in these barrels once its API
 * settles.
 *
 * Re-exports:
 * - {@link Entity} — abstract base for domain entities.
 * - {@link ValueObject} — abstract base for immutable, validated wrappers.
 */

export { Entity } from "./entity";
export { ValueObject } from "./value-object";
