/**
 * @module @roastery/beans/entity
 *
 * Public entry point for the entity pillar. **Only the `Entity` base class and
 * the `EntityUpdater` are surfaced here**; the supporting helpers, factories,
 * services, symbols, dtos, schemas, and types live one level deeper at
 * dedicated subpaths (`@roastery/beans/entity/symbols`, `…/dtos`, `…/types`, …)
 * so consumers keep their imports narrow.
 *
 * Re-exports:
 * - {@link Entity} — abstract base class every domain entity extends.
 * - {@link EntityUpdater} — field-level updater that rebuilds an entity
 *   through the Mapper round-trip.
 */

export { Entity } from "./entity";
export { EntityUpdater } from "./entity-updater";
