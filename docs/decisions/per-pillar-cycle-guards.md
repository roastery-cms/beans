# Cycle guards stay per-pillar; `cycleError` moved up

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

Each pillar keeps its own `deriving`/`constructing` sets and — **necessarily** — its own
`models` memo, since the entity's holds a schema carrying the identity fields and the same
blueprint object could be handed to both `entityOf` and `recordOf`.

Per-pillar sets still catch a cycle that *alternates* pillars (`Entity A → Record R →
Entity A`), because the nested call happens inside the outer guard's own `try` and `A` is
therefore still in `deriving` when the recursion comes back.

What did move is `cycleError`, now `shared/helpers/cycle-error.ts` taking a
`label: "Command" | "Entity" | "Record"` — the same shape `installAccessors`'s `label` already
had, and for the same reason: identical logic, one differing word.

## What the guard buys

A blueprint `A → B → A` recurses in two independent places — schema derivation and
construction — and both are guarded by a set of in-progress blueprints, so you get a
`CyclicEntityDefinitionException` naming the type instead of a bare `RangeError`. The guard
releases on the way out, so two properties of the *same* entity class in one blueprint
(siblings, not a cycle) keep working. The cycle still has to be broken; the guard only makes
it diagnosable.

A `Command` blueprint **can** close a cycle, and does not guard against it itself: `modelFor`
and `buildProperty` **delegate** into the record pillar for a record-valued key, and that
pillar's own `deriving`/`constructing` sets raise `CyclicEntityDefinitionException`. A cycle
through a multiplicity wrapper is caught the same way — the wrapper delegates to the same
blueprint object, so the inner pillar's `deriving` guard catches it.
