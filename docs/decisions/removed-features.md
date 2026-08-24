# Removed features — and the ones marked "do not reintroduce"

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

## `onRead` / `onHydrate` — never existed, and must not

**There is deliberately no `onRead`/`onHydrate` lifecycle decorator.** Rebuilding an entity from
storage changes nothing, so it is not a domain fact — and since a repository hydrates through
`fromJSON`, an event raised there would ride along in every `CommandResult`: a command that merely
loads an aggregate in order to delete it would surface a spurious "read" next to the real event.
Audit reads in the repository, where the read actually happens. **Do not reintroduce one.**

## `beforeHandle` / `afterHandle` (removed in 0.4.0)

The method-decorator pair was removed because both marked the same domain instant — the method ran
— and the only observable difference between them was whether the event survived an exception the
method usually did not throw. That is a decision the reader has to make at the declaration site
with no domain meaning behind it, so `emit` keeps the `afterHandle` semantics and the choice is
gone.

## `construction-lifecycle-decorator.ts` and `methodHandleDecorator`

Both were shared helpers parameterised by a flag, earned while each had two genuinely parallel
consumers:

- `construction-lifecycle-decorator.ts` was parameterised by a `fireWhenFresh` flag to serve
  `onCreate` and `onRead`. With `onRead` gone and one consumer left, the indirection went with it
  — the logic now lives inline in `on-create.decorator.ts`.
- `methodHandleDecorator(event, runBefore)` built `beforeHandle`/`afterHandle` off a flag.
  Removing `afterHandle` left one consumer, and the indirection went the same way — `emit`'s whole
  runtime lives inline in `emit.decorator.ts`.

`onError` never shared that helper anyway: its control flow (`try`/`catch` plus a factory call) is
not a variation on the same bracket shape, the same reasoning that keeps `readDefinition`
duplicated per pillar.

## `src/actions/` and `src/events.symbol.ts`

The slot symbols are **not** declared in this package. `Context`, `Demo`, `Events`, `Meta`,
`Properties`, `Rules`, `Source` and `Storage` come from `@roastery/terroir/symbols` — terroir
0.2.0 moved the first six there so the whole ecosystem shares one declaration site, and 0.2.1
added `Events`.

Symbol equality is by reference, so re-declaring any of them locally would key a *different* slot:
reads return `undefined` and the type-level matches
(`Instance extends { [Properties]: infer Shape }`) silently stop resolving.

`src/actions/` existed for this and is gone, as are `src/entity/rules.symbol.ts` and
`src/events.symbol.ts` — `Rules` and then `Events` were the local holdouts, in turn, and terroir
now ships both. `grep -rn 'Symbol("' src` must return **zero** hits. **Do not reintroduce one.**

## `DirectlyRegistrableKeys`

A near-identical copy of `RegistrableKeys` differing only in checking against the raw
`Dependencies` instead of `AugmentedDependencies` — exactly "the same question one hop shallower".
It is now `RegistrableKeys<Spec, Deps, false>`, via the `WithCommands` depth flag. See
[registry-gate-and-loop-guard.md](registry-gate-and-loop-guard.md).

## `minimum: 0` on `NumberSchema` (removed in 0.4.0)

It made the generically-named `NumberVO` silently reject a delta or a balance. `PositiveNumberVO`
is what that used to mean. See
[numeric-grid-and-transforms.md](numeric-grid-and-transforms.md).

## `RepositoryPage` (non-parametric)

Replaced by `RepositoryPageOf<EntityClass>`, which carries `orderBy` — see
[ordering-is-part-of-the-port.md](ordering-is-part-of-the-port.md).

## Entity factories

The package no longer ships entity factories: fresh identity comes from the `Entity` base itself,
and fixtures from `X.demo()` (or, for a `Command`, the same `X.demo()` static). The `.agent/`
rules still mention them.

## Duplicated helpers that were merged into `shared/`

`installAccessors`, `applyRuleDefaults` and `rulesOf` used to be duplicated per pillar, on the
grounds that reaching into `domain/entity/helpers` would cross a barrel boundary — but all three
are byte-identical in behaviour, so the copies only guaranteed that a fix to one would silently
miss the other.

`installAccessors` in particular was documented as differing "in the nested-entity branch of the
getter"; **it never did** — the getter is `return this.get(key)` in both, and the nested-entity
branch lives in `Entity.get`, which is where it belongs. Its only real difference was the pillar
name quoted in the collision message, now a `label` parameter.

`cycleError` moved up to `shared/helpers/` the same way, taking a
`label: "Command" | "Entity" | "Record"`. `installRunners` followed the same reasoning while there
were still two registry pillars: identical logic, one differing word (`source`), so the evented one
imported it by direct path instead of keeping a second copy. Merging the two into `commands` removed
even that word — it now lives in `commands/helpers/install-runners.ts` with the `source` hard-coded,
and `cycle-error.ts` collapsed the same way, one function for both kinds of chain node.

`readDefinition` stays duplicated **on purpose**: its identity *is* the method name it probes
(`defineEntity` vs. `defineCommand`) and the message explaining the class-field trap, so
parameterising it would trade duplication for indirection with nothing gained.

## `NestedEntityInput`'s old derivation

It previously derived from `Omit<ReturnType<toJSON>, keyof IRawEntity>`, which stripped the
identity only at the outermost level — a *grandchild* then still demanded its `id`/`createdAt`
**and** its ruled keys, so a three-level aggregate (or `set` on a nested entity that itself holds
one) could not be written without a cast. It is now just `ConstructionValuesOf<Shape>` — the
*same* type the top level uses, which is what makes the relaxation recurse for free.
