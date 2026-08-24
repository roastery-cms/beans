---
name: beans-commands
description: Use when working with `commands` (`src/application/commands/`), when wiring use cases to dependencies, when a `.get(key)` is rejected by the type system, when declaring `Siblings` / `WithSiblingCommands` / `deps.commands` on a use case, when writing an event reaction (`IEventHandler`, `defineEventHandler`, `.on(...)`), or when touching `RegistrableKeys` / `SiblingCommands` / `CommandRunner` / `DepsOfClass` / `LoopDetectedException` / `IEventEmitter`.
---

# The `commands` registry

One pillar, one function, two overloads. `commands(spec).withDependencies(deps)` gates `.get(key)` to
only the spec keys whose declared `Deps` the `Dependencies` record structurally satisfies.
`commands(spec, { emitter, onError? }).withDependencies(deps)` is the same registry gaining event
behaviour — publication plus `.on()` reactions.

```ts
const registry = commands({
	createUser: CreateUserCommand, // Deps = { secrets; users }
	renameTag: RenameTagCommand,   // Deps = void
}).withDependencies({ secrets, users });

await registry.createUser(payload);        // constructs + execute()s in one call
await registry.get("createUser")(payload); // the same function object, reached the long way
```

## Inviolable rules

1. **Two-phase, for `blueprint`'s reason** — a literal cannot reference its own `typeof`. Never collapse
   `commands(spec)` and `withDependencies(deps)` into one call.
2. **`.get(key)` returns a bound, ready-to-run function** — not the class, not an unexecuted instance.
3. **The accessor and `.get()` must stay the same function object.** `CommandRunnersOf` is keyed by the
   *same* `RegistrableKeys` union `.get()` accepts and states no gating rule of its own, so the two forms
   cannot drift.
4. **`emitter` stays required *inside* `options`, and so does `transaction` inside `CommandsOptions`.**
   `emitter` is what distinguishes the two overloads; making it optional would collapse them and hand
   back a registry whose `.on()` publishes nowhere. `transaction` is required for a second reason on top
   of that one: **TypeScript computes an argument's completions from the overload that matches**, so an
   empty `{}` matching the events-free overload offers `transaction` and hides `emitter`/`onError` from
   the editor entirely. `{}` must match *neither* overload — then the completion list is the union of
   both. Verified with `getCompletionsAtPosition`, not assumed; `commands(spec, {})` is a compile error
   and there is a `@ts-expect-error` test pinning it.
   The **evented overload is declared first** so `{ emitter, transaction }` resolves to it and not to the
   events-free one, and the runtime gate for installing `.on()` is `emitter`, never `options` —
   `commands(spec, { transaction })` takes options and still has no bus.
5. **`RegistrableKeys`'s `WithCommands` flag must always be instantiated with a literal `true`/`false`**
   — `boolean` is `true | false`, and a conditional over a naked type parameter distributes, which would
   collapse both branches and silently uncap the depth.
6. **`RegistrableKeys` must keep both `Deps = void` branches**: `unknown extends DepsOfClass<...>` (the
   elided-parameter form) and `DepsOfClass<...> extends void` (the explicit one).
7. **`WithSiblingCommands`'s empty guard is `[keyof Siblings] extends [never]`, and its default is
   `Record<never, never>`** — never `Record<string, never>`, and it must resolve to `Deps` *itself* when
   empty, never `Deps & { commands: {} }`.
8. **The loop guard's `chain` is threaded fresh per call, never a shared mutable `Set`** — `execute()` is
   async, and a shared guard cannot tell two unrelated concurrent calls apart from a real cycle.
9. **Reaction matching is by event `name`, never `instanceof`** — `Entity.raiseEvent` spreads the built
   event into a fresh plain object before buffering it, so the class relationship does not survive.
10. **A throwing reaction must never reject the `CommandResult`** of the command that raised the event.
11. **The command-class vocabulary lives in `application/command/types/`**, re-exported by
    `commands/types` — moving it back would cycle the two pillars.
12. **`buildCommands`'s `inTransaction` flag is threaded explicitly, never derived from `chain`.** The
    chain mixes `command:` and `event:` nodes, and a command dispatched by a reaction has a `command:`
    ancestor while still needing a boundary of its own — so "am I nested?" and "is a boundary already
    open?" are different questions and only one of them is on the chain.

## The gate

`Deps` has zero runtime footprint, so registrability exists only as a type-level constraint. The runtime
installs every spec key; the type exposes only the registrable ones. A caller who bypasses TypeScript
(`as never`, plain JS) faces no runtime check — `execute()` just receives whatever `dependencies` was.

The check is **structural, not exact**: `execute` is method shorthand, which TypeScript exempts from
`strictFunctionTypes`'s contravariant parameter checking. Documented, not engineered around.

A spec key colliding with a member the registry already carries throws `PropertyNameCollisionException`
from `withDependencies` — `get` always, `on` only when `options` was supplied (without it there is no
`.on()`, so a key called `on` is installable), plus anything on `Object.prototype`. The test is
`key in registry`, not `Object.hasOwn` (a spec key called `toString` would otherwise shadow an inherited
member), and the install is **atomic** — every collision is checked before any property is defined.

An unknown key at runtime throws `InvalidPropertyException`. Every exception this pillar raises carries
`source: "commands"` — `InvalidPropertyException`, `PropertyNameCollisionException`,
`LoopDetectedException` and `nameOf`'s `InvalidEntityDefinitionException` alike.

## Sibling commands, typed automatically

The registry injects a `commands` bag into every command's `execute()` and every reaction's `handle()`.
The **type** shows it when the author names the sibling classes:

```ts
type Deps = { users: UserRepo };
type Siblings = { login: typeof LoginCommand }; // classes, never runners

class UpdateUser extends defineUseCase<typeof props, Deps, User, Siblings>(props, "update-user") {
	protected async handle(deps: WithSiblingCommands<Deps, Siblings>): Promise<User> {
		await deps.commands.login({ email, password }); // payload and result both typed
	}
}
```

`Siblings` is **given, not inferred** — a use case is declared before the registry that registers it
exists, so `typeof spec` would be circular. `SiblingCommands` (registry side) *computes* its keys from the
spec; `WithSiblingCommands` (declaration side) is *given* them.

`commandOf`, `aggregateCommandOf`, `defineUseCase` and both `defineEventHandler` overloads take it as the
**last, always-defaulted** type parameter, and pass `WithSiblingCommands<Deps, Siblings>` — not the bare
`Deps` — into the bound base they generate. That is the whole of the parameter's runtime footprint: none.

A reaction that needs *only* the commands bag still passes `unknown` in the `Deps` slot first —
`defineEventHandler<OrderConfirmed, unknown, { sendReceipt: typeof SendReceiptCommand }>` — since
`unknown & { commands: … }` reduces to the bag alone. For the hand-written
`implements IEventHandler<Event, Deps>` form, `IEventHandler` is unchanged at two parameters; apply
`WithSiblingCommands` to its `Deps` argument yourself.

The gate needed no change: a class built this way resolves `DepsOfClass` to the same shape a hand-written
`Deps` used to spell out. A sibling only reachable *through* another sibling's `commands` is still not
provably safe, and `.get()` still withholds it.

## With an emitter

Every event a registered command's `CommandResult` carries is published through the supplied
`IEventEmitter`, and reactions registered via `.on(eventClass, handlerClass)` run — `await`ed, isolated —
before that call resolves.

- **One bag of runners, reached from everywhere**: `.get()`, the direct accessors, a command's own
  `deps.commands` and a reaction's are all built by the same `buildCommands(chain)`, one instance per
  point in the call chain. A command dispatched from inside another command therefore publishes and
  reacts exactly as one dispatched from outside. (Until the two registries were merged this pillar kept a
  second, undecorated bag underneath for `Deps.commands`, and a nested command's events reached no
  emitter at all.)
- The accessors live on `self` itself, installed before it is handed out, so a chained `.on(...).on(...)`
  never loses them. `EventedCommandsOf` = `IEventedCommands & CommandRunnersOf`, an intersection because
  an interface cannot declare a mapped type over a generic key union — `CommandsOf` is the same shape
  minus `.on()`.
- Without `options` the `.on` property is never defined at all — the runtime half of the overload split,
  and what keeps a spec key called `on` installable in the events-free form.
- A reaction is a class implementing `IEventHandler<Event, Deps>` (one method, `handle`) — an interface,
  not an abstract base like `Command`, since there's no blueprint to validate and so nothing to centralize.
  `defineEventHandler(handle, name?)` builds one from just the function, the same `(args) => class` idiom
  `defineDomainEvent`/`defineValueObject` use, returning `EventHandlerClassOf<Event, Deps>`.
- `helpers/name-of.ts` resolves an event's name **once, at `.on()` time**, off an
  `Object.create(eventClass.prototype)` probe — the same construction-free pattern `definitionOf` uses for
  a blueprint.
- `deps.commands` is gated at compile time by `RegistrableEventHandlerClass`, a conditional applied
  directly to `.on()`'s parameter rather than `RegistrableKeys`'s collapse-a-known-union approach, since
  `.on()` takes one candidate class at a time with no finite spec to map over first — same one-hop
  limitation, same reason (no fixpoint proof at arbitrary depth).
- A throwing reaction is isolated via `helpers/default-on-error.ts`'s microtask re-throw fallback, or the
  optional `onError` hook.
- A chain cycling back to a command key or event name already on it throws `LoopDetectedException`
  (HTTP 508) from `helpers/cycle-error.ts`; for a cycle closing on an *event* specifically, `react()`
  routes it through `onError`/`defaultOnError` like any other reaction failure, preserving the
  never-reject guarantee.
- The emitter for a Node host is `NodeEventEmitterAdapter` (`@roastery/beans/node`).

## With a transaction

`transaction` lives on **both** overloads (`CommandsOptions`, which `EventedCommandsOptions` extends):
publication and atomicity are orthogonal problems and each arrives when its own does.

```ts
commands(spec, { transaction: (work) => runner.run(work) }).withDependencies(deps);
```

- **Only a class carrying the `transactional` marker is wrapped**, and only around its `execute()`.
  Construction stays outside (an invalid payload must not open a boundary), and so do `emit` and the
  reactions — the order is `COMMIT` → `emit` → react.
- **A boundary is resolved once per bag**, as
  `!inTransaction && isTransactional(CommandClass) ? transaction : undefined`, and the nested bag is
  built with `inTransaction || boundary !== undefined`. A reaction's bag restarts at `false`, because by
  then the raising command already committed.
- **Marker without runner is not an error** — it runs unwrapped. `transactionalKeysOf(spec)` is the
  bootstrap net for anyone who wants otherwise, mirroring `uniqueKeysOf`.
- **The marker is a plain `static`, not a symbol** — read structurally by `isTransactional`, so a
  hand-written `static readonly transactional = true` counts, and a subclass inherits it. A symbol here
  would have to come from `@roastery/terroir/symbols`, which is a change to another package for a flag
  `static readonly definition` already shows how to carry.

> Detail: [registry-gate-and-loop-guard.md](../../../docs/decisions/registry-gate-and-loop-guard.md)
> · [transactional-boundary.md](../../../docs/decisions/transactional-boundary.md)
> · [way-barrel-scope.md](../../../docs/decisions/way-barrel-scope.md)
