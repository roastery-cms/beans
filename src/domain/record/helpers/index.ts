/**
 * @module @roastery/beans/domain/record/helpers
 *
 * Public helpers of the record pillar.
 *
 * The construction machinery stays internal and is imported by direct path,
 * which knip counts as usage: `build-context` (`buildContext`,
 * `buildProperty`), `model-for` (`modelFor`, also the entity pillar's entry
 * point into this one), `read-definition` (`readDefinition`, `definitionOf`)
 * and `read-bound-definition` (`readBoundDefinition`). Adding one of them here
 * would widen the published API.
 *
 * Re-exports:
 * - {@link recordOf} — a `DomainRecord` base already bound to a blueprint.
 */

export { recordOf } from "./record-of";
