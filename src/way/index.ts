/**
 * @module @roastery/beans/way
 *
 * The Roastery Way: one import path for the low-ceremony subset of `beans`
 * — everything needed to model a domain, raise and react to events, and
 * expose behaviour as a use case, without ever touching `class X extends
 * Entity/Command/ValueObject`, a `defineEntity`/`defineCommand`/`defineMeta`
 * override, an `interface X extends AccessorsOf<…> {}` merge, or a terroir
 * symbol.
 *
 * **This is not a third layer.** `domain` and `application` are still the
 * only two layers `beans` has — every name below is re-exported verbatim
 * from its original home there, nothing is reimplemented, and nothing here
 * has its own behaviour. `way` is a curated barrel that spans both layers,
 * picking only the entries whose whole design goal was already minimizing
 * ceremony (`entityOf`, `defineDomainEvent`, `defineUseCase`,
 * `defineEventHandler`, `commandRegistry`, `eventedRegistry`) over the
 * "precise" class forms that sit right next to them in their own pillars. Reach past this barrel,
 * into the specific subpath, the moment a use case needs more than one
 * aggregate as its result, an entity needs a computed `defineEntity()`, or
 * any other case the "Key rules" sections of the README call out as the
 * reason the low-ceremony form doesn't fit.
 *
 * **The value-object catalog lives one level deeper**, at
 * `@roastery/beans/way/collections/value-objects` (plus its `optional`,
 * `nullable` and `custom` subpaths) — mirroring how neither `domain` nor
 * `application` puts its own catalog in its own root barrel either. Flattened
 * in here directly, the ~45 VO names would drown the half-dozen names that
 * actually shape how a `way`-built feature is put together.
 *
 * Re-exports, grouped by what they're for:
 * - **Domain modeling** — {@link blueprint} (declare properties + rules),
 *   {@link entityOf} (bind a blueprint to an `Entity` base with no
 *   `defineEntity()`/interface merge).
 * - **Domain events** — {@link defineDomainEvent} (a payload-less event
 *   class from just its name).
 * - **Use cases** — {@link defineUseCase} (bind a blueprint to a
 *   single-aggregate `AggregateCommand`, implementing only `handle()`).
 * - **Reactions** — {@link defineEventHandler} (an event reaction from just
 *   its `handle` function).
 * - **Orchestration** — {@link commandRegistry} (register use cases behind
 *   their dependencies; `.get(key)` hands back a ready-to-run function) and
 *   {@link eventedRegistry} (the same thing, plus auto-publishing every
 *   event a use case raises and running the reactions registered with
 *   `.on()`), together with {@link IEventEmitter} (the contract to adapt an
 *   event bus to, so `eventedRegistry` can publish through it).
 *
 *   **Both are here on purpose, and `commandRegistry` is the one to start
 *   with.** `eventedRegistry` takes a required `IEventEmitter`, so reaching
 *   for it means deciding where events go before there is anything to
 *   publish — a real step to climb for someone who has not met domain
 *   events yet. `commandRegistry` asks for none of that and is not a
 *   lesser tool: `eventedRegistry` is built *on* it, delegating command
 *   construction and execution to it wholesale. A `CommandResult` still
 *   carries its `events` either way, so nothing is lost by starting here —
 *   moving up later is a change of registry, not of use cases.
 * - **Domain modeling without identity** — {@link recordOf}, the same
 *   low-ceremony factory shape as `entityOf` for a composite value that
 *   deserves verbs (`Money`, `Address`, `DateRange`) but is not a row: no
 *   `id`, no `createdAt`, and mutable only through the verbs it declares. A
 *   record is usable as a key of an entity, a command or another record.
 * - **Persistence ports** — {@link RepositoryOf} (a repository contract
 *   derived from an entity's own blueprint, type-only). The granular `ICan*`
 *   capabilities it is assembled from — the unit a use case asks for in its
 *   `Deps` — stay behind `@roastery/beans/domain/repository/types`, the same
 *   escape hatch every other precise form keeps.
 */

export { blueprint, entityOf } from "@/domain/entity/helpers";

export { recordOf } from "@/domain/record/helpers";

export { defineDomainEvent } from "@/domain/domain-event";

export { defineUseCase } from "@/application/command/helpers";

export { commandRegistry } from "@/application/command-registry";

export {
	defineEventHandler,
	eventedRegistry,
} from "@/application/evented-registry";
export type { IEventEmitter } from "@/application/evented-registry/types";

export type { RepositoryOf } from "@/domain/repository/types";
