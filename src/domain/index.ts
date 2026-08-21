/**
 * @packageDocumentation
 *
 * `@roastery/beans` — DDD building blocks for the Roastery CMS ecosystem.
 *
 * The package exposes these import surfaces; pick the one that matches the
 * layer you are working at:
 *
 * - `"@roastery/beans"` (this barrel) — {@link Entity}, {@link ValueObject},
 *   {@link blueprint} and {@link DomainEvent}: the two base classes plus the
 *   two things most subclasses declare right alongside them. Almost every
 *   consumer starts here.
 * - `"@roastery/beans/domain/entity"` — the entity pillar ({@link Entity} and
 *   {@link blueprint}). Subpaths: `/entity/helpers` (`blueprint`'s original
 *   home, plus `deepEquals`, `generateUUID`) and `/entity/types` (`IEntity`,
 *   `IRawEntity`, `AccessorsOf`, …).
 * - `"@roastery/beans/domain/domain-event"` — the optional abstract `DomainEvent`
 *   base for events raised through `Entity.raiseEvent`. Subpath:
 *   `/domain-event/types` (`IDomainEvent`, the contract it implements).
 * - `"@roastery/beans/domain/record"` — the record pillar ({@link DomainRecord}
 *   and `recordOf`): an `Entity` **without identity**, for the composite domain
 *   values that deserve verbs. Subpaths: `/record/helpers` (`recordOf`) and
 *   `/record/types` (`IRecord`, `RecordDefinition`, `RecordAccessorsOf`, …).
 * - `"@roastery/beans/domain/value-object"` — the abstract {@link ValueObject} base.
 *   Subpaths: `/value-object/helpers` (`metaOf`) and `/value-object/types`
 *   (`IValueObjectContext`, `IValueObjectMetadata`).
 * - `"@roastery/beans/domain/collections/schemas"` and `"…/collections/value-objects"`
 *   — ready-to-use TypeBox schemas and Value Objects for the most common
 *   scalar/array shapes.
 *
 * The symbols keying the bases' internal slots (`Context`, `Demo`, `Meta`,
 * `Properties`, `Source`, `Storage`) are **not** declared here — they come from
 * `"@roastery/terroir/symbols"`, the ecosystem's single declaration site.
 * Symbol equality is by reference, so a local redeclaration would read the
 * wrong slot and silently return `undefined`.
 *
 * The root barrel stays narrow on purpose: the base classes plus `blueprint`
 * and `DomainEvent`, the things most subclasses need right alongside them —
 * everything else (types, the rest of `entity/helpers`, collections) lives
 * behind a subpath.
 *
 * Re-exports:
 * - {@link blueprint} — declares a blueprint carrying domain rules (`default` / `derive`).
 * - {@link DomainEvent} — optional abstract base for writing domain-event classes.
 * - {@link DomainRecord} — abstract, blueprint-driven base for domain records:
 *   an entity minus identity, mutable only through its own verbs.
 * - {@link Entity} — abstract, blueprint-driven base for domain entities.
 * - {@link ValueObject} — abstract, self-validating base for immutable domain values.
 */

export { Entity, blueprint } from "./entity";
export { DomainRecord } from "./record";
export { ValueObject } from "./value-object";
export { DomainEvent } from "./domain-event";
