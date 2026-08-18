/**
 * @module @roastery/beans/domain/domain-event
 *
 * Public entry point for the domain-event pillar.
 *
 * Re-exports:
 * - {@link DomainEvent} — convenience abstract base for writing domain-event classes.
 * - {@link defineDomainEvent} — factory building a payload-less `DomainEvent`
 *   class from just its name, for when a whole subclass would be boilerplate.
 *
 * The {@link IDomainEvent} interface and {@link DomainEventClassOf} live one
 * level deeper at `@roastery/beans/domain/domain-event/types` and are **not**
 * re-exported here, mirroring how the package keeps types behind a dedicated
 * `/types` subpath.
 */

export { defineDomainEvent } from "./define-domain-event";
export { DomainEvent } from "./domain-event";
