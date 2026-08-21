/**
 * @module @roastery/beans/domain/record
 *
 * The record pillar: `DomainRecord`, an `Entity` **without identity**.
 *
 * A record has no `id`, `createdAt` or `updatedAt` and is never a row. It
 * exists for the composite domain values that deserve behaviour — `Money`,
 * `Address`, `DateRange` — which would otherwise be flattened into a
 * `customObjectVO` that validates their shape and can do nothing else.
 * Everything else the entity pillar offers is here: a blueprint-derived
 * schema, strict hydration, demo fixtures, blueprint rules, redaction, and
 * mutation through a `protected` `set`/`setMany`, so only the record's own
 * domain verbs may change it.
 *
 * A record blueprint accepts all three property kinds — value-objects, nested
 * entities and nested records — and a record may itself be a key of an entity,
 * a command or another record.
 *
 * It raises no domain events (an event belongs to an aggregate root, and a
 * record has no identity to report), but it does forward a **deep**
 * `pullDomainEvents` to whatever entities it nests, so their buffers are never
 * stranded behind it.
 *
 * Subpaths: `/record/helpers` (`recordOf`) and `/record/types` (`IRecord`,
 * `RecordDefinition`, `RecordAccessorsOf`, …).
 *
 * Re-exports:
 * - {@link DomainRecord} — abstract, blueprint-driven base for domain records.
 * - {@link recordOf} — the factory form, which removes the `defineRecord` and
 *   the accessor interface merge.
 */

export { DomainRecord } from "./record";
export { recordOf } from "./helpers";
