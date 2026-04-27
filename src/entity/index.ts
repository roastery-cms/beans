/**
 * @module @roastery/beans/entity
 *
 * Public entry point for the entity pillar. **Only the abstract base class is
 * surfaced here**; the supporting helpers, factories, services, symbols,
 * dtos, schemas, and types live one level deeper at dedicated subpaths
 * (`@roastery/beans/entity/symbols`, `…/dtos`, `…/types`, …) so consumers
 * keep their imports narrow.
 *
 * Re-exports:
 * - {@link Entity} — abstract base class every domain entity extends.
 */

export { Entity } from "./entity";
