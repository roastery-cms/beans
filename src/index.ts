/**
 * @packageDocumentation
 *
 * `@roastery/beans` — DDD building blocks for the Roastery CMS ecosystem.
 *
 * The package exposes four import surfaces; pick the one that matches the layer
 * you are working at:
 *
 * - `"@roastery/beans"` (this barrel) — the three top-level pillars
 *   ({@link Entity}, {@link Mapper}, {@link ValueObject}). Almost every consumer
 *   starts here.
 * - `"@roastery/beans/entity"` — the entity pillar. Subpaths: `/entity/dtos`,
 *   `/entity/schemas`, `/entity/decorators` (`@AutoUpdate`),
 *   `/entity/factories` (`makeEntity`), `/entity/helpers`
 *   (`generateUUID`, `slugify`), `/entity/services`
 *   (`ParseEntityToDTOService`), `/entity/symbols` (the four symbols),
 *   `/entity/types` (`IEntity`, `IRawEntity`).
 * - `"@roastery/beans/mapper"` — the {@link Mapper} namespace.
 * - `"@roastery/beans/value-object"` — the abstract {@link ValueObject} base
 *   (with `IValueObjectMetadata` one level deeper at `/value-object/types`).
 * - `"@roastery/beans/collections"` — ready-to-use DTOs (`/collections/dtos`),
 *   Schemas (`/collections/schemas`) and Value Objects (`/collections/value-objects`)
 *   for the most common scalar/array/object shapes.
 *
 * The intentionally thin root barrel keeps `import { Entity } from "@roastery/beans"`
 * unambiguous; everything more specific lives behind a subpath.
 *
 * Re-exports:
 * - {@link Entity} — abstract base for domain entities.
 * - {@link Mapper} — Entity ⇄ DTO bridge (`toDTO`, `toDomain`).
 * - {@link ValueObject} — abstract base for immutable, validated wrappers.
 */

export { Entity } from "./entity";
export { Mapper } from "./mapper";
export { ValueObject } from "./value-object";
