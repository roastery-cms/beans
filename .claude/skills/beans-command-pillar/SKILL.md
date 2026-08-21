---
name: beans-command-pillar
description: Use when writing or editing a use case / command — `Command`, `AggregateCommand`, `commandOf`, `aggregateCommandOf`, `defineUseCase`, `defineCommand()`, `execute()`, `handle()`, `CommandResult`, `collectDomainEvents`, `collectResult`, `CommandAccessorsOf` — anything under `src/application/command/`, or when a command's input validation, exception layer, blueprint shape, redaction or demo/hydration behaviour needs to be decided.
---

# The command pillar

A `Command` is structurally the same blueprint-driven construction/validation machine as `Entity`, minus
identity and minus mutation: built once, read through typed accessors, then `execute()`d with whatever
dependencies its behaviour needs.

`defineUseCase(properties, source, extra?)` is the default form — a friendlier-named alias of
`aggregateCommandOf`, for the common single-aggregate case:

```ts
class CreateUser extends defineUseCase<typeof props, Deps, User>(props, "create-user") {
	protected async handle(deps: Deps): Promise<User> {
		const user = new User(this.payload);
		await deps.users.create(user);
		return user; // execute() wraps it via collectResult
	}
}
```

The class form (`extends Command<typeof props, Deps, Result>` + `defineCommand()` + `execute()` + the
`interface X extends CommandAccessorsOf<…> {}` merge) stays correct and is the one to reach for when the
definition is computed rather than stated.

## Inviolable rules

1. **`defineCommand` must be a prototype method, never a class field, and must be pure** — same trap and
   same `InvalidEntityDefinitionException` guard as `defineEntity`/`defineMeta`.
2. **A command blueprint holds `ValueObject` or `DomainRecord` classes (and wrappers), never a bare
   `Entity` or `Command`.** A command's input is a payload, not an aggregate root.
3. **`execute()` is the only place I/O or side effects belong.** Construction stays synchronous and fails
   fast on bad input, so `Deps` only ever reaches the subclass through `execute`'s parameter — never the
   constructor.
4. **`Command` never publishes anything** and has no `[Events]`/`raiseEvent` of its own. Only an `Entity`
   may raise a domain event; a command can only *collect* what an entity it touched already raised.
5. **`CommandResult.events` is always an array, never `undefined`**, mirroring `pullDomainEvents()`.
6. **`Command.toJSON()` redacts** (unlike `Entity`'s) — a command is never persisted, and `toJSON` is what
   a structured logger reaches through `JSON.stringify`.
7. **Definition-time mistakes reuse the domain exceptions; input failures are re-tagged
   `application`-layer** — `UnprocessableContentException` (422) from `buildProperty`,
   `BadRequestException` (400) from `fromJSON`, each preserving the original as `cause`.
8. **Keep the `biome-ignore` on `demo`/`fromJSON`** — `noThisInStatic` is a *safe* fix and
   `biome check --fix` would rewrite the `this` into the abstract base.
9. **Call `commandOf`/`aggregateCommandOf`/`defineUseCase` once, at module scope.**

## `Command` versus `Entity`

- **No identity, no mutation.** `[Context]` has no `BaseContext` intersected in
  (`CommandContextOf<Shape>` is just `{ [Key in CommandDomainKeys<Shape>]: Shape[Key]["prototype"] }`),
  there is no `id`/`createdAt`/`updatedAt` getter, and there is no `set`/`setMany` — a command that needs
  to change something calls a business method on the `Entity` it orchestrates inside `execute()`.
- **No `[Events]`, `[Storage]` or `[Rules]` slot of its own.** It reuses four of terroir's eight symbols
  (`Context`, `Demo`, `Properties`, `Source`) and introduces no ninth.
- **No `onSet`** — it never mutates, and its input failures are already re-tagged at its own boundary.
- **`unique` is ignored** — never persisted, no set of rows.
- **Rules resolve once, at construction**, exactly as on `Entity`, and apply in `demo()` so a command
  fixture stays coherent.
- **`X.demo()`/`X.fromJSON(row)` work exactly like `Entity`'s** (same sentinel, same whole-payload
  `additionalProperties: false` validation on `fromJSON` — the entry point for an HTTP request body).

## Records in a command blueprint

`CommandPropertiesShapeBase = Record<string, AnyValueObjectClass | AnyRecordClass>`. Two consequences,
both stated rather than engineered around:

- a record blueprint may itself hold an entity, so a command payload can reach one **transitively**;
- a command blueprint **can** close a cycle, and does not guard against it itself — `modelFor` and
  `buildProperty` **delegate** into the record pillar, whose own `deriving`/`constructing` sets raise
  `CyclicEntityDefinitionException`.

`get()` returns the nested **instance** for a record-valued key (via `CommandReadValueOf`), so a record's
questions stay reachable from inside `execute()`; `toJSON()` reaches a nested record through its
`toSafeJSON()`, so each applies its own declared keys.

## Results and events

`CommandResult<Result> = { readonly result: Result; readonly events: readonly IDomainEvent[] }`.

- **`collectDomainEvents(...aggregates)`** drains one or more
  `{ pullDomainEvents(): readonly IDomainEvent[] }`-shaped buffers and concatenates them in call order —
  typed **structurally**, not against the concrete `Entity` class.
- **`collectResult(result, ...rest)`** is its one-call sibling: `{ result, events: collectDomainEvents(result, ...rest) }`.
  Reach for `collectDomainEvents` directly when the result isn't itself an aggregate (a `string`, `null`, …)
  or when more composition is needed.
- The structural bound is not a style choice: a concrete `Entity<Shape>` is not assignable to a nominal
  `Entity<PropertiesShapeBase>` bound, the same incompatibility `EntityConstructor` sidesteps for the
  decorators' mixin base.

## `AggregateCommand` and the three factories

- **`AggregateCommand<Shape, Deps, Result>`** specializes `Command` for the case where the result is a
  single aggregate and `execute()`'s last line is always `return collectResult(result)`. `execute` is
  concrete here and calls `collectResult(await this.handle(deps))`; the subclass implements
  `protected abstract handle(deps: Deps): Promise<Result>`. `handle` is `protected` — `execute()` stays the
  one public verb, the same reasoning that keeps `Entity.raiseEvent` protected. `Result` carries the exact
  structural bound `collectResult` declares, duplicated inline rather than factored out.
- **`commandOf<Shape, Deps, Result, Siblings?>(properties, source, extra?)`** is `entityOf`'s twin: returns
  a base bound to the blueprint via `BoundCommand`, so the subclass owes only `execute()` — no
  `defineCommand()`, no accessor merge. `Deps`/`Result` are explicit because no blueprint mentions them.
- **`aggregateCommandOf`** is the same for `AggregateCommand` (via `BoundAggregateCommand`), so the subclass
  owes only `handle()`. **`defineUseCase`** delegates to it outright, for a consumer who doesn't need the
  DDD vocabulary; it is the one `application/command` name re-exported from `@roastery/beans/way`.
- `BoundCommand`/`BoundAggregateCommand` are **not exported from any barrel**. Both read a
  `static readonly definition` the factory stamps on, through the shared `readBoundDefinition`, which
  differs only in which factory name its guard message suggests.
- All the class-returning factories annotate their return (`CommandClassOf`, `AggregateCommandClassOf`) —
  TS4060.
- Both factories pass `WithSiblingCommands<Deps, Siblings>` — not the bare `Deps` — into the bound base;
  see skill `beans-command-registry`.

## Where the machinery lives

`application/command/helpers/` holds ordinary internal modules (`buildContext`, `modelFor`,
`readDefinition`, `readBoundDefinition`) — unlike `Entity`'s, which must stay inside `entity.ts` to avoid a
circular import. Nothing in a command's construction machinery needs to import `Command` itself.

`rulesOf`, `applyRuleDefaults` and `installAccessors` come from `@/shared/helpers`; `blueprint`, `RulesOf`,
`PropertyRule`, `RuledBlueprint` and `BlueprintBuilder` are imported straight from `@/domain/entity`;
`readDefinition` and the `Command*`-prefixed blueprint types are duplicated on purpose.

> Detail: [exception-layer-split.md](../../../docs/decisions/exception-layer-split.md)
> · [redaction-asymmetry.md](../../../docs/decisions/redaction-asymmetry.md)
> · [module-cycles-and-file-layout.md](../../../docs/decisions/module-cycles-and-file-layout.md)
> · registries: skill `beans-command-registry` · modeling: skill `beans-domain-modeling`
