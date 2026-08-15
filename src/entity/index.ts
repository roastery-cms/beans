/**
 * @module @roastery/beans/entity
 *
 * Public entry point for the entity pillar. **Only the `Entity` base class is
 * surfaced here**; the supporting helpers and types live one level deeper at
 * dedicated subpaths (`@roastery/beans/entity/helpers`, `…/types`), and the
 * symbols keying the base's slots live at `@roastery/terroir/symbols` — so
 * consumers keep their imports narrow.
 *
 * Re-exports:
 * - {@link Entity} — abstract, blueprint-driven base class every domain entity extends.
 */

export { Entity } from "./entity";
