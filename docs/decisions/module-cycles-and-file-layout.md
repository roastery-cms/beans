# Module cycles, file layout, and what each barrel publishes

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

## One thing per file

Each type alias in its own `types/<kebab>.type.ts`, each interface in
`types/<kebab>.interface.ts`, each helper function in its own `helpers/<kebab>.ts`. Barrels
re-export only the public surface — internal types/helpers are imported by direct path
(`@/domain/entity/types/raw-value-of.type`, `@/domain/entity/helpers/read-definition`), which knip
counts as usage.

## What must stay inside `domain/entity/entity.ts`

The construction machinery that references the `Entity` class itself (`isEntity`, `rawOf`'s
entity branch, `buildProperty`, `buildContext` + `constructing`) **stays inside
`domain/entity/entity.ts`** — extracting it would create circular imports.

`BoundEntity` is there for the same reason, one step stronger: it `extends Entity`, so it must be
*evaluated* after the class exists, and a sibling module throws
`ReferenceError: Cannot access 'Entity' before initialization` on some import orders (this
actually happened — `BoundEntity` started life in its own file).

What does **not** touch the class was extracted: `acceptsUndefined`, `buildBaseContext`,
`cycleError`, `modelOfValueObject` and `RAW_ENTITY_KEYS` live in `domain/entity/helpers/` and are
imported back by direct path. `modelFor` moved out too, once `isEntityClass` became structural.

`application/command/command.ts` does **not** have this constraint: nothing in its construction
machinery needs to import `Command` itself, so `buildContext`/`modelFor`/`installAccessors` live as
ordinary internal helpers under `application/command/helpers/`.

## Never import across pillars through a barrel

`record/` reaches `blueprint` at `@/domain/entity/helpers/blueprint`, because
`@/domain/entity/helpers`'s `index.ts` pulls in `entity-of.ts` → `entity.ts`. That is the rule that
keeps `class BoundRecord extends DomainRecord` out of the `modelFor` cycle.

The `modelFor` cycle itself is deliberate and safe: `entity/helpers/model-for.ts`,
`record/helpers/model-for.ts` and `wrapper/helpers/model-for.ts` import each other and are all
**class-free**, so they reach each other at call time and never during module evaluation. Keep them
class-free.

## Barrels with no `index.ts`, on purpose

`package.json`'s `exports` uses the `./*` wildcard mapping to `dist/*/index.d.ts`, so *any* barrel
becomes a public subpath. `src/shared/helpers/`, `src/shared/redaction/`,
`src/testing/helpers/`, `domain/collections/value-objects/helpers/` and `src/domain/repository/`
(at the pillar root) deliberately have none, so they stay genuinely internal while knip still counts
the direct-path imports as usage.

## What each helper barrel publishes

`domain/entity/helpers/index.ts` exports `blueprint`, `entityOf`, `entityHas`, `deepEquals`,
`generateUUID` and `uniqueKeysOf`. `resolveUniqueKeys` is **not** among them — it is the internal
engine `uniqueKeysOf` and `Entity`'s constructor both call by direct path, the same line that keeps
`readDefinition` internal. `extractIdentity` and `readDefinition`/`definitionOf` are internal —
`entity.ts` is their only consumer and imports each by direct path. Adding one to the barrel widens
the published API, so leave them out unless that is the intent.

`application/command/helpers/index.ts` draws the same line, differently shaped: `aggregateCommandOf`,
`collectDomainEvents`, `collectResult`, `commandOf` and `defineUseCase` are public;
`readDefinition`, `readBoundDefinition`, `modelFor` and `buildContext` are internal to
`command.ts`/`aggregate-command.ts`.

## What the root and layer barrels re-export

The root `@roastery/beans` re-exports `Entity`, `DomainRecord`, `ValueObject`, `blueprint`,
`DomainEvent` and `Command` — the base classes plus `blueprint`, the one thing most subclasses of
either declare right alongside them — and nothing else; everything more specific lives behind a
subpath.

`domain/index.ts` mirrors that same pairing at the domain layer's own level (`Entity` +
`DomainRecord` + `ValueObject` + `blueprint` + `DomainEvent`), and `application/index.ts` mirrors it
at the application layer's (`Command` and `AggregateCommand`, plus `commandRegistry` —
`AggregateCommand` is reachable here and from `application/command`, but **not** from the root
barrel, the same "narrower than a base class" reasoning that already keeps `commandRegistry` out of
the root).

`blueprint`'s `export` line lives in three places (`domain/entity/helpers/index.ts`, its original
home; `domain/entity/index.ts`; and the root `index.ts`) despite one-thing-per-file governing
everywhere else — a barrel re-exporting an already-declared symbol isn't a second declaration.

There is **no** bare `@roastery/beans/domain/collections`, `@roastery/beans/application/collections`
or `@roastery/beans/way/collections` barrel — the real subpaths are the specific ones.

## `shared/` is for what both pillars need verbatim

Put something in `src/shared/helpers/` only when both pillars need the exact same behaviour — a
helper that would need an `if (pillar === …)` belongs to a pillar, not here. `UnionToIntersection`
stayed local to the repository pillar for exactly that reason.

## The three-way split between `application/command` and `domain/entity`

- *Shared through `src/shared/helpers/`* (behaviourally identical in both pillars):
  `installAccessors`, `applyRuleDefaults`, `rulesOf`, `cycleError`, `readSetHandlers`, and the six
  structural discriminants.
- *Imported straight from the domain pillar* (already public, already generic enough):
  `blueprint`, `RulesOf`, `PropertyRule`, `RuledBlueprint`, `BlueprintBuilder`.
- *Duplicated on purpose*: `readDefinition`, whose whole content is the pillar-specific method name
  and message, and the types `DomainKeys`/`AnyValueObjectClass`/`RuledKeys`/`UndefinedableKeys`
  (under `Command*`-prefixed names), which describe a narrower blueprint shape.

## One intentional naming pair

`EntityStorage` is the runtime class (`domain/entity/entity-storage.ts` — internal, not re-exported
from any barrel), `Storage` is the symbol keying its per-instance slot
(`@roastery/terroir/symbols`).

## Cross-pillar imports that are expected

`entity.ts` imports `IDomainEvent` from `@/domain/domain-event/types` — the first place the `@/*`
alias crosses from `entity/` into a sibling pillar *within* `domain/`. `application/command`
crossing into `domain/` for `IDomainEvent` in `CommandResult` is the second — and that crossing is
expected: `application` depends on `domain`, never the reverse.
