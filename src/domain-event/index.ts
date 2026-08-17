/**
 * @module @roastery/beans/domain-event
 *
 * Public entry point for the domain-event pillar.
 *
 * Re-exports:
 * - {@link DomainEvent} — convenience abstract base for writing domain-event classes.
 *
 * The {@link IDomainEvent} interface lives one level deeper at
 * `@roastery/beans/domain-event/types` and is **not** re-exported here,
 * mirroring how the package keeps types behind a dedicated `/types` subpath.
 */

export { DomainEvent } from "./domain-event";
