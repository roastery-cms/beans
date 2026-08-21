/**
 * @packageDocumentation
 *
 * `@roastery/beans` — DDD building blocks for the Roastery CMS ecosystem.
 *
 * The package is split in two layers, each importable on its own:
 *
 * - `"@roastery/beans/domain"` — {@link Entity}, {@link ValueObject},
 *   {@link blueprint} and {@link DomainEvent}: the domain layer's building
 *   blocks. Subpaths go one level deeper (`/domain/entity`,
 *   `/domain/value-object`, `/domain/domain-event`, `/domain/collections/*`).
 * - `"@roastery/beans/application"` — {@link Command}: the application
 *   layer's building block, orchestrating domain behavior behind a
 *   validated, schema-driven input. Subpaths: `/application/command`,
 *   `/application/collections/*` (an alias onto the domain catalog, so a
 *   Command's blueprint never has to reach across layers).
 *
 * This root barrel stays narrow on purpose: the base classes plus
 * `blueprint`, the one thing most subclasses declare right alongside them
 * — everything else (types, helpers, collections) lives behind a subpath.
 *
 * The symbols keying the bases' internal slots (`Context`, `Demo`, `Events`,
 * `Meta`, `Properties`, `Rules`, `Source`, `Storage`) are **not** declared
 * here — they come from `"@roastery/terroir/symbols"`, the ecosystem's
 * single declaration site. Symbol equality is by reference, so a local
 * redeclaration would read the wrong slot and silently return `undefined`.
 *
 * Re-exports:
 * - {@link blueprint} — declares a blueprint carrying domain rules (`default` / `derive`).
 * - {@link Command} — abstract, blueprint-driven base for application-layer commands.
 * - {@link DomainEvent} — optional abstract base for writing domain-event classes.
 * - {@link DomainRecord} — abstract, blueprint-driven base for domain records:
 *   an entity minus identity, mutable only through its own verbs.
 * - {@link Entity} — abstract, blueprint-driven base for domain entities.
 * - {@link ValueObject} — abstract, self-validating base for immutable domain values.
 */

export {
	blueprint,
	DomainEvent,
	DomainRecord,
	Entity,
	ValueObject,
} from "./domain";
export { Command } from "./application";
export {
	configureRedaction,
	redactionConfig,
} from "./shared/redaction/redaction-config";
export type {
	IRedactionConfig,
	RedactionPlaceholder,
	RedactionPlaceholderFn,
} from "./shared/redaction/redaction-config";
