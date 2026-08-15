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
 *   `/entity/helpers` (`blueprint`, `deepEquals`, `generateUUID`) and
 *   `/entity/types` (`IEntity`, `IRawEntity`, `AccessorsOf`, …).
 * - `"@roastery/beans/value-object"` — the abstract {@link ValueObject} base.
 *   Subpaths: `/value-object/helpers` (`metaOf`) and `/value-object/types`
 *   (`IValueObjectContext`, `IValueObjectMetadata`).
 * - `"@roastery/beans/collections/schemas"` and `"…/collections/value-objects"`
 *   — ready-to-use TypeBox schemas and Value Objects for the most common
 *   scalar/array shapes.
 *
 * The symbols keying the bases' internal slots (`Context`, `Demo`, `Meta`,
 * `Properties`, `Source`, `Storage`) are **not** declared here — they come from
 * `"@roastery/terroir/symbols"`, the ecosystem's single declaration site.
 * Symbol equality is by reference, so a local redeclaration would read the
 * wrong slot and silently return `undefined`.
 *
 * The intentionally thin root barrel keeps `import { Entity } from "@roastery/beans"`
 * unambiguous; everything more specific lives behind a subpath.
 *
 * Re-exports:
 * - {@link Entity} — abstract, blueprint-driven base for domain entities.
 * - {@link ValueObject} — abstract, self-validating base for immutable domain values.
 */

export { Entity } from "./entity";
export { ValueObject } from "./value-object";
