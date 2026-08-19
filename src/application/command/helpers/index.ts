/**
 * @module @roastery/beans/application/command/helpers
 *
 * Public helpers of the command pillar. `readDefinition`, `readBoundDefinition`,
 * `rulesOf`, `applyRuleDefaults`, `installAccessors`, `modelFor` and
 * `buildContext` are internal — `command.ts`/`aggregate-command.ts` are
 * their only consumers and import each by direct path, the same split the
 * entity pillar draws between its public and internal helpers.
 *
 * Re-exports:
 * - {@link aggregateCommandOf} — builds an `AggregateCommand` base already
 *   bound to a blueprint, so a subclass declares only its `handle()`.
 * - {@link collectDomainEvents} — drains one or more aggregates' domain-event
 *   buffers into the shape `CommandResult.events` expects.
 * - {@link collectResult} — builds a whole `CommandResult` from the result
 *   aggregate in one call, delegating to `collectDomainEvents` underneath.
 * - {@link commandOf} — builds a `Command` base already bound to a
 *   blueprint, so a subclass declares only its `execute()`.
 * - {@link defineUseCase} — friendlier-named entry point onto
 *   `aggregateCommandOf`, same class and behaviour.
 */

export { aggregateCommandOf } from "./aggregate-command-of";
export { collectDomainEvents } from "./collect-domain-events";
export { collectResult } from "./collect-result";
export { commandOf } from "./command-of";
export { defineUseCase } from "./define-use-case";
