# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is an **operational brief**: the rules you need to avoid writing wrong code. The reasoning behind
closed decisions lives in `docs/decisions/*.md`; per-pillar know-how lives in `.claude/skills/*/SKILL.md`
and is loaded on demand. Read `README.md` first — it stays in sync with the API and shows the canonical
subclass patterns. `CHANGELOG.md` follows Keep a Changelog and is updated manually per release.

## Project

`@roastery/beans` is a pre-1.0 TypeScript library shipping the DDD building blocks for the Roastery CMS
ecosystem, split into **two layers**: `domain/` (the blueprint-driven `Entity`, `DomainRecord`,
`ValueObject`, `DomainEvent`, the type-only `repository` port generator, the multiplicity `wrapper`s and
the `collections` catalog) and `application/` (`Command`/`AggregateCommand` plus the two registries).
Four directories are **not** layers: `shared/` (internals both pillars need verbatim), `way/`
(re-export-only barrel over the low-ceremony subset), `testing/` (a time-of-use concern —
`inMemoryRepositoryOf` and `inMemoryTransactionOf`) and `node/` (a host concern — every `node:*` import in the package). All schema
validation flows through `@roastery/terroir` (a TypeBox-backed schema/exception toolkit), currently on
**0.2.1**, which also owns the well-known symbols keying the bases' slots.

## Tooling

Bun is managed by **mise** (`mise.toml` pins `bun = "latest"`). Always invoke toolchain binaries through
it — the husky hooks do the same:

```bash
mise exec -- bun run test:unit       # full unit suite
mise exec -- bun run test:coverage   # with coverage
mise exec -- bun test path/to/file.spec.ts        # single file
mise exec -- bun test --test-name-pattern "<re>"  # filter by it/describe name

mise exec -- bunx tsc --noEmit -p tsconfig.json   # type-check only (tsconfig has noEmit: true)
mise exec -- bunx biome check                     # lint without auto-fix
mise exec -- bun run knip                         # detect orphan exports/dependencies
mise exec -- bun run build                        # biome --fix && knip && tsup → dist/
mise exec -- bun run setup                        # build + bun link (for local linking into a consumer)
```

Test files use `.spec.ts` and live next to the file under test.

Husky enforces:
- **commit-msg**: commitlint with `@commitlint/config-conventional` — commits must follow Conventional Commits.
- **pre-commit**: `bun run test:unit` runs on every commit.

## Layout

One line per pillar; the skill named at the end of a line carries that pillar's rules.

**`src/domain/`**
- `entity/` — the `Entity` base, `EntityStorage`, `helpers/`, `types/`, and `decorators/` (`onCreate`,
  `onUpdate`, `onDelete`, `emit`, `onError`). Skills `beans-domain-modeling`, `beans-blueprint-rules`,
  `beans-entity-decorators`.
- `record/` — `DomainRecord`: an `Entity` minus identity, *with* mutation. Skill `beans-domain-modeling`.
- `value-object/` — the `ValueObject` base, `metaOf`, its types. Skill `beans-domain-modeling`.
- `domain-event/` — `DomainEvent`, `defineDomainEvent`, `IDomainEvent`. Its own pillar, not nested under
  `entity/`. Skill `beans-domain-events`.
- `wrapper/` — `arrayOf`, `optionalOf`, `nullableOf`. Skill `beans-wrappers`.
- `repository/` — **`repository/types/` only, type-only, no `index.ts` at the pillar root**: `RepositoryOf`
  and the nine `ICan*` contracts. Skill `beans-repository-port`.
- `collections/` — 21 Schema / Value Object pairs, plus `custom/`, `optional/`, `nullable/`. Skills
  `beans-collections`, `beans-custom-vo-factories`.

**`src/application/`**
- `command/` — `Command`, `AggregateCommand`, `commandOf`, `aggregateCommandOf`, `defineUseCase`,
  `collectDomainEvents`, `collectResult`, plus `decorators/` (`transactional`, declarative only —
  nothing here wraps `execute()`). Skill `beans-command-pillar`.
- `commands/` — `commands(spec, options?).withDependencies(deps)`. `emitter` inside `options` is what
  adds `.on()`, auto-published events and reactions; `transaction` is orthogonal and available in both
  overloads. Also `transactionalKeysOf`. Skill `beans-commands`.
- `collections/` — hand-kept re-export alias onto `domain/collections/*`. Skill `beans-collections`.

**The four non-layers** — `src/shared/` (`helpers/` and `redaction/`, both barrel-free on purpose),
`src/way/` (zero logic, only `export { X } from "..."` lines), `src/testing/` (`inMemoryRepositoryOf`
plus `inMemoryTransactionOf`, the rollback runner over its stores — skill `beans-testing-double`),
`src/node/` (`NodeEventEmitterAdapter`).

**Subpaths.** Every `src/**/index.ts` becomes a public entry point through `exports`' `./*` wildcard —
check the real list in `package.json`. Inside the package use the `@/*` alias (`@/domain/entity`,
`@/application/command`, `@/way`).

**Two import rules are traps, not style:**
- **Never import across pillars through a barrel.** `record/` reaches `blueprint` at
  `@/domain/entity/helpers/blueprint`, because `@/domain/entity/helpers`'s `index.ts` pulls in
  `entity-of.ts` → `entity.ts`.
- **The three `modelFor`s (`entity`, `record`, `wrapper`) import each other and must stay class-free.**
  That cycle is safe only because none of them references a class; anything that does (`BoundEntity`,
  `BoundRecord`, `buildProperty`, `buildContext`) stays inside its pillar's base-class module or throws
  `ReferenceError: … before initialization` on some import orders.

> Detail: [module-cycles-and-file-layout.md](docs/decisions/module-cycles-and-file-layout.md) ·
> [per-pillar-cycle-guards.md](docs/decisions/per-pillar-cycle-guards.md) ·
> [way-barrel-scope.md](docs/decisions/way-barrel-scope.md) ·
> [record-is-entity-minus-identity.md](docs/decisions/record-is-entity-minus-identity.md)

## Traps

Silent or hard-to-diagnose failures. Each one has bitten this repo.

- **`defineMeta` / `defineEntity` / `defineRecord` / `defineCommand` / `defineName` must be prototype
  methods, never class fields, and must be pure.** The base calls them inside the constructor (a field
  initializer runs only after `super()` returns) and probes them on an `Object.create`d instance.
  Guarded with `InvalidEntityDefinitionException` — except `onSet`, where the class-field form is only
  catchable on the first *mutation*.
- **With the class form, the `interface X extends AccessorsOf<…> {}` merge is what types the accessors.**
  Skip it and they still work but stay invisible to TypeScript — **the one silent failure mode left**.
  Prefer `entityOf`/`recordOf`/`commandOf`/`defineUseCase`, which need no merge.
- **Never declare a slot symbol locally.** All eight (`Context`, `Demo`, `Events`, `Meta`, `Properties`,
  `Rules`, `Source`, `Storage`) come from `@roastery/terroir/symbols`; a local redeclaration keys a
  *different* slot, so reads return `undefined` and type-level matches silently stop resolving.
  `grep -rn 'Symbol("' src` must return **zero** hits.
- **A symbol used as a computed key is a *value* import, not `import type`.** `verbatimModuleSyntax`
  erases `import type` outright, so getting this backwards throws
  `ReferenceError: Rules is not defined` from inside `buildContext` — every construction breaks at once
  while the module graph loads fine.
- **Every mapped type over a blueprint must go through `DomainKeys<Shape>`** (or its pillar's
  equivalent), or the `Rules` symbol slot leaks as an accessor, a schema field and a serialized key.
- **Every conditional over a blueprint *property* needs all four branches** — value-object, entity,
  record, wrapper. A missing branch falls through to `never` (or to `false`), which type-checks and
  says nothing: that is how `SchemaOf`, `CommandSchemaOf` and `EntityHas` each ended up lying about a
  runtime that was correct. Probe the wrapper's two statics **inline** (never `extends AnyWrapperClass`
  — TS2589) and write that branch first.
- **The `biome-ignore` comments on `demo`/`fromJSON` are load-bearing**: `biome check --fix` (which
  `bun run build` runs) classifies `noThisInStatic` as a *safe* fix and would rewrite the `this` into the
  abstract base, making those statics build the base instead of the subclass.
- **Annotate the return type of every factory that returns a class declared in its own body** —
  `ValueObjectClassOf`, `DomainEventClassOf`, `CommandClassOf`, `AggregateCommandClassOf`,
  `RecordClassOf`, `WrapperClassOf`. An inferred one fails the declaration build with **TS4060** and
  emits no `.d.ts`.
- **Call every class-returning factory once, at module scope.** Each call mints a fresh schema *and* a
  fresh class: `instanceof` does not relate two calls, and a factory called inside `defineEntity()` /
  `defineMeta()` / `defineCommand()` recompiles per construction — silently, only slower.
- **Never type-check a scratch file whose name starts with a dot.** TypeScript's default `include`
  (`**/*`) does not match dotfiles, so `tsc --noEmit` exits 0 while ignoring `.probe.ts`. Use a plain
  name and delete it afterwards.
- **A blueprint key may not collide with an existing member** (`schema`, `toJSON`, `get`, `set`, `id`, …)
  — `PropertyNameCollisionException`, checked atomically before anything is defined. A record blueprint
  may additionally not name `id`/`createdAt`/`updatedAt`; an entity blueprint never declares them at all.
- **Mixin and method-decorator shapes have fixed requirements** (`any[]` rest parameter, `abstract class
  Decorated`, `const replacement: typeof target = function …`, `target.apply(this, args)`) — see skill
  `beans-entity-decorators` before touching `decorators/`.

> Detail: [typescript-traps.md](docs/decisions/typescript-traps.md) ·
> [decorator-mixin-traps.md](docs/decisions/decorator-mixin-traps.md) ·
> [transactional-boundary.md](docs/decisions/transactional-boundary.md) ·
> [removed-features.md](docs/decisions/removed-features.md)

## Subclass patterns

The preferred form of each base, one example and the rules that decide correctness. `README.md` carries
the full patterns, including the class forms; skills `beans-domain-modeling`, `beans-blueprint-rules`,
`beans-domain-events` and `beans-wrappers` carry the details.

### ValueObject

```ts
class StringVO extends ValueObject<string, typeof StringSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return { default: "string", schema: StringSchema };
	}
}
```

- `meta.default` must pass `meta.schema`, and may be a **thunk** — prefer one whenever it is expensive,
  since `defineMeta()` runs on every construction.
- `transform()` normalises before validation and **never runs over defaults** — declare them canonical.
- `meta.unique` is declarative; nothing in the domain enforces it. Only `sensitive: true` on a VO
  suppresses repository methods; a per-aggregate `sensitive: [...]` list redacts but does not.
- Subclassing a VO inherits everything, *including* the parent's lack of constraints.

### Entity

```ts
class Author extends entityOf(authorProperties, "author") {
	public rename(value: string): void {
		this.set("name", value);
		this.raiseEvent(AuthorRenamed);
	}
}
```

- The base supplies `id`/`createdAt`/`updatedAt`. Identity in a payload is **all-or-nothing**
  (`IncompleteIdentityException` at runtime).
- `setMany` is the mutation primitive and `set` delegates to it: validate all, build all, then assign;
  `updatedAt` is stamped once, only if something changed.
- `new X(row)` ignores unknown keys; **`X.fromJSON(row)` validates the whole payload** and rejects extra
  and missing keys — use it for untrusted origin. `X.demo()` is the entry point without data.
- `raiseEvent` is `protected` and stamps `occurredAt`/`aggregateId` itself; `pullDomainEvents()` is
  **shallow by default** — pass `{ deep: true }` whenever a nested entity, record or wrapper may hold
  events. `beans` ships no dispatcher.
- Transient state goes in `[Storage]`, domain state in the blueprint. `destroy()` is a marker, not a
  guard. `isUnique(key)` reports the declaration and must never become async.
- `blueprint(shape).with(rules)` attaches `{ default }` or `{ derive }` (mutually exclusive); resolution
  is explicit value > `default` > `derive`, rules apply in `demo()` and **never re-fire on `set`**. A
  rule-less blueprint closes with `.done()`, never `.with({})`.
- `onSet()` returns per-key handlers that run on the **raw** value before it is built, enforce by
  **throwing**, and never rewrite (that is `transform`'s job).

### DomainRecord

```ts
class Money extends recordOf({ amount: IntegerVO, currency: StringVO }, "money") {
	public add(cents: number): boolean {
		return this.set("amount", this.amount + cents);
	}
}
```

- An `Entity` minus identity, *with* mutation. No `[Events]`/`raiseEvent`, no `[Storage]`, no
  `destroy()`, no `unique`; `pullDomainEvents` only forwards the deep form.
- No `updatedAt` stamp, so `setMany`'s **`boolean` return is the only signal that anything changed**.
- The lifecycle and method decorators do not apply — nothing guards this at runtime.

### Command

```ts
class CreateUser extends defineUseCase<typeof props, Deps, User>(props, "create-user") {
	protected async handle(deps: Deps): Promise<User> { /* … */ }
}
```

- Blueprint of value objects, records and wrappers — **never a bare `Entity` or `Command`**. No
  identity, no `set`/`setMany`, no `onSet`, no `[Events]`.
- `execute()` is the only place I/O belongs; `Deps` reaches the subclass only through its parameter.
  `AggregateCommand`/`defineUseCase` implement `execute()` for you — write `handle()` instead.
- Return a `CommandResult` via `collectResult(aggregate)` (or `collectDomainEvents(...)`). A command
  never publishes; it only surfaces what an entity raised.
- **Input failures re-tag as `application`-layer** (`UnprocessableContentException` from construction,
  `BadRequestException` from `fromJSON`), while definition-time mistakes keep the domain exceptions.
- **`Command.toJSON()` redacts**; `Entity`/`DomainRecord`'s does not (round-trip contract) and offers
  `toSafeJSON()`.
- **`@transactional` marks, it never wraps.** It stamps `static readonly transactional = true`; the
  boundary is opened by `commands`' `transaction` option, around `execute()` alone — never around
  construction, publication or reactions (`COMMIT` → `emit` → react). A marked command in a registry
  with no runner **runs normally**, by design; `transactionalKeysOf(spec)` is the bootstrap net, the
  way `uniqueKeysOf` is for `unique`. A nested command inherits the open boundary; one dispatched by a
  reaction opens its own. **A nested command's events are held until the boundary above it closes** —
  publishing when it resolved would put them inside a transaction still open, and a reaction to them
  would open a second `BEGIN` inside the first. A throwing `emitter` is isolated through `onError`, like
  a throwing reaction: the command already committed. In a test,
  `inMemoryTransactionOf(...repositories)` (`@/testing`) is the runner that actually rolls back — rows
  only, never entities, and **one transaction at a time** (an overlapping `run` throws).

### Multiplicity wrappers

```ts
const postProperties = blueprint({ tags: arrayOf(PostTag), author: optionalOf(Author) }).done();
```

- Reads are unwrapped and there is no `.add()`: appending replaces the whole list through `set`, passing
  existing items back **through `toJSON()`** so their `id`s survive.
- `optionalOf` and `nullableOf` are not interchangeable — only `optionalOf` makes a key omittable.
- A wrapper never wraps a wrapper; a wrapped key derives no repository method; `demo()` yields an empty
  container.

## Shape questions

Two helpers in `domain/entity/helpers` answer the same family of question — *is this key backed by this
class?* — `entityHas` as a boolean, `reshapeTo` as the payload cut down to a target. Only the reshape pair
is on `@/way`. Skill `beans-domain-modeling`.

```ts
const cardShape = reshapeShape({ title: StringVO, author: AuthorCard, tags: arrayOf(TagCard) });
PostCard.fromJSON(reshapeTo(cardShape, post)); // identity rides along, at the root and every level
```

- **A target is not a blueprint.** `reshapeShape` never reaches `entityOf`/`recordOf` and carries no rules:
  `default`/`derive` act on construction input, so a rule can never stand in for a key an already-built
  source lacks. A target key may nest another target instead of naming a class.
- **A class in the target states multiplicity and must match the source's exactly; a nested target states
  none** and adopts the source's. It declares no identity either, so that comes from the source too — an
  entity contributes it, a record has none to give. A nested target against a value-object key throws.
- **Nested aggregates match structurally, the value-object leaf nominally.** `AuthorCard` need share nothing
  with `Author` — that is the point — but two separate `customRecordVO()` calls do *not* match: mint the
  class once, at module scope, and reference it from both sides.
- **The cut is taken from `toJSON()`, never `toSafeJSON()`** — redacting would break the round trip that
  makes the payload hydratable. A mismatch throws `InvalidPropertyException` carrying the dotted path
  (`"author.twitter"`, `"tags[].headline"`) before anything is projected.

## Conventions

- **Reach for the specific domain exception, not the generic one** (`ImmutablePropertyException`,
  `PropertyNameCollisionException`, `IncompleteIdentityException`, `InvalidEntityDefinitionException`,
  `CyclicEntityDefinitionException`). Tests assert the class and the `property`/`source` slots, never a
  message substring; every exception takes a trailing `ErrorOptions`, so keep the `cause`.
- **Layers**: domain exceptions for definition-time mistakes anywhere; `ApplicationException` only where
  a command's own input crosses its boundary; `InfraException` only in `src/testing/`.
  See [exception-layer-split.md](docs/decisions/exception-layer-split.md).
- **`tsconfig.json` has `verbatimModuleSyntax: true` and `strict: true`** — type-only imports must use
  `import type`; mixing types into value imports breaks the build.
- **One thing per file**: one type per `types/<kebab>.type.ts`, one interface per
  `types/<kebab>.interface.ts`, one function per `helpers/<kebab>.ts`.
- **Re-exports are explicit (`export { X } from "..."`), not `export *`**, and barrels are sorted
  alphabetically. Barrels publish only the public surface; internals are imported by direct path, which
  knip counts as usage.
- **A directory with no `index.ts` is internal on purpose** (`shared/helpers`, `shared/redaction`,
  `testing/helpers`, `repository/` at its root) — adding one publishes a subpath.
- **Put a helper in `src/shared/helpers/` only when both pillars need the exact same behaviour**; one
  that would need an `if (pillar === …)` belongs to a pillar.
- **TSDoc is mandatory** on every non-test source file, in **English** — descriptions + `@param` +
  `@returns` + `@throws` + `@typeParam` + `@example` + `@see`, with `@module` (or
  `@packageDocumentation` for the root) on every barrel. Runtime error messages are English too.
- **Don't use `any` in tests** (rule from `.agent/rules/dont-use-any-type.md`).
- **`bun:test` is the only testing framework** (rule from `.agent/rules/use-bun-test.md`).
- `noUnsafeDeclarationMerging` is off in `biome.json` because the `AccessorsOf` merge is deliberate;
  each such interface still needs its own `biome-ignore lint/correctness/noUnusedVariables`.

## Agent context (`.agent/`)

`.agent/` is a git submodule of the Caffeine.js Agent Guide reused here as the Roastery agent context. It
contains shared rules (`.agent/rules/*.md` — language style, no-`any` in tests, `bun:test`, Biome
guidance) and workflows (`.agent/workflows/*.md` — `smart-commit`, layered review workflows). Note the
rules occasionally reference `@caffeine/*` packages — the closest equivalents in this repo are
`@roastery/beans/domain/entity/helpers` (`blueprint`, `deepEquals`, `generateUUID`) and, for
application-layer orchestration, `@roastery/beans/application/command/helpers` (`collectDomainEvents`).
The rules also mention entity factories, which this package no longer ships: fresh identity comes from the
`Entity` base itself, and fixtures from `X.demo()` (or, for a `Command`, the same `X.demo()` static).
