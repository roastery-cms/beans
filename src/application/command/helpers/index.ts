/**
 * @module @roastery/beans/application/command/helpers
 *
 * Public helpers of the command pillar. `readDefinition`, `rulesOf`,
 * `applyRuleDefaults`, `installAccessors`, `modelFor` and `buildContext` are
 * internal — `command.ts` is their only consumer and imports each by direct
 * path, the same split the entity pillar draws between its public and
 * internal helpers.
 *
 * Re-exports:
 * - {@link collectDomainEvents} — drains one or more aggregates' domain-event
 *   buffers into the shape `CommandResult.events` expects.
 * - {@link collectResult} — builds a whole `CommandResult` from the result
 *   aggregate in one call, delegating to `collectDomainEvents` underneath.
 */

export { collectDomainEvents } from "./collect-domain-events";
export { collectResult } from "./collect-result";
export { commandOf } from "./command-of";
