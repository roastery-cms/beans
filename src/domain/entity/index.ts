/**
 * @module @roastery/beans/domain/entity
 *
 * Public entry point for the entity pillar: the `Entity` base class and
 * `blueprint`, re-exported together since a blueprint with rules is
 * typically declared right where its `Entity` subclass is. The rest of
 * `entity/helpers` (`deepEquals`, `generateUUID`) and all of `entity/types`
 * stay one level deeper, at dedicated subpaths (`@roastery/beans/domain/entity/helpers`,
 * `…/types`), and the symbols keying the base's slots live at
 * `@roastery/terroir/symbols` — so consumers keep the rest of their imports
 * narrow. `DomainEvent`, the optional abstract base for events raised
 * through `Entity.raiseEvent`, is its own pillar at
 * `@roastery/beans/domain/domain-event`.
 *
 * Re-exports:
 * - {@link blueprint} — declares a blueprint carrying domain rules (`default` / `derive`); its original home is `@roastery/beans/domain/entity/helpers`.
 * - {@link Entity} — abstract, blueprint-driven base class every domain entity extends.
 */

export { Entity } from "./entity";
export { blueprint } from "./helpers";
