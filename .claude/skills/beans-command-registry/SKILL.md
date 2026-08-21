---
name: beans-command-registry
description: Use when working with `commandRegistry` or `eventedRegistry` (`src/application/command-registry/`, `src/application/evented-registry/`), when wiring use cases to dependencies, when a `.get(key)` is rejected by the type system, when declaring `Siblings` / `WithSiblingCommands` / `deps.commands` on a use case, when writing an event reaction (`IEventHandler`, `defineEventHandler`, `.on(...)`), or when touching `RegistrableKeys` / `SiblingCommands` / `CommandRunner` / `DepsOfClass` / `LoopDetectedException` / `IEventEmitter`.
---

# Command registries

Two pillars. `commandRegistry(spec).withDependencies(deps)` gates `.get(key)` to only the spec keys
whose declared `Deps` the `Dependencies` record structurally satisfies. `eventedRegistry(spec, emitter,
options?).withDependencies(deps)` is the same thing gaining event behaviour.

```ts
const registry = commandRegistry({
	createUser: CreateUserCommand, // Deps = { secrets; users }
	renameTag: RenameTagCommand,   // Deps = void
}).withDependencies({ secrets, users });

await registry.createUser(payload);        // constructs + execute()s in one call
await registry.get("createUser")(payload); // the same function object, reached the long way
```

## Inviolable rules

1. **Two-phase, for `blueprint`'s reason** — a literal cannot reference its own `typeof`. Never collapse
   `commandRegistry(spec)` and `withDependencies(deps)` into one call.
2. **`.get(key)` returns a bound, ready-to-run function** — not the class, not an unexecuted instance.
3. **The accessor and `.get()` must stay the same function object.** `CommandRunnersOf` is keyed by the
   *same* `RegistrableKeys` union `.get()` accepts and states no gating rule of its own, so the two forms
   cannot drift.
4. **`RegistrableKeys`'s `WithCommands` flag must always be instantiated with a literal `true`/`false`**
   — `boolean` is `true | false`, and a conditional over a naked type parameter distributes, which would
   collapse both branches and silently uncap the depth.
5. **`RegistrableKeys` must keep both `Deps = void` branches**: `unknown extends DepsOfClass<...>` (the
   elided-parameter form) and `DepsOfClass<...> extends void` (the explicit one).
6. **`WithSiblingCommands`'s empty guard is `[keyof Siblings] extends [never]`, and its default is
   `Record<never, never>`** — never `Record<string, never>`, and it must resolve to `Deps` *itself* when
   empty, never `Deps & { commands: {} }`.
7. **The loop guard's `chain` is threaded fresh per call, never a shared mutable `Set`** — `execute()` is
   async, and a shared guard cannot tell two unrelated concurrent calls apart from a real cycle.
8. **Reaction matching is by event `name`, never `instanceof`** — `Entity.raiseEvent` spreads the built
   event into a fresh plain object before buffering it, so the class relationship does not survive.
9. **A throwing reaction must never reject the `CommandResult`** of the command that raised the event.
10. **The command-class vocabulary lives in `application/command/types/`**, re-exported by
    `command-registry/types` — moving it back would cycle the two pillars.

## The gate

`Deps` has zero runtime footprint, so registrability exists only as a type-level constraint. The runtime
installs every spec key; the type exposes only the registrable ones. A caller who bypasses TypeScript
(`as never`, plain JS) faces no runtime check — `execute()` just receives whatever `dependencies` was.

The check is **structural, not exact**: `execute` is method shorthand, which TypeScript exempts from
`strictFunctionTypes`'s contravariant parameter checking. Documented, not engineered around.

A spec key colliding with a member the registry already carries throws `PropertyNameCollisionException`
from `withDependencies` — `get` for `commandRegistry`, `get` and `on` for `eventedRegistry`, plus anything
on `Object.prototype`. The test is `key in registry`, not `Object.hasOwn` (a spec key called `toString`
would otherwise shadow an inherited member), and the install is **atomic** — every collision is checked
before any property is defined. `installRunners` lives in `command-registry.ts`; `evented-registry.ts`
imports it by direct path rather than keeping a copy.

An unknown key at runtime throws `InvalidPropertyException`, `source` fixed to `"command-registry"`.

## Sibling commands, typed automatically

Both registries inject a `commands` bag into every command's `execute()` and every reaction's `handle()`.
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

## `eventedRegistry`

Every event a registered command's `CommandResult` carries is auto-published through the injected
`IEventEmitter`, and reactions registered via `.on(eventClass, handlerClass)` run — `await`ed, isolated —
before that call resolves.

- It **delegates command construction/execution to a real `commandRegistry(spec).withDependencies(deps)`
  underneath** rather than reimplementing it, building a second, parallel `commands` bag — one instance
  per point in the call chain, via its own `buildCommands(chain)` — reachable from both `.get()` and every
  reaction's `deps.commands`, so a reaction's own command call runs through the same decorated runner and
  its events are themselves auto-published and auto-reacted-to.
- The accessors live on `self` itself, installed before it is handed out, so a chained `.on(...).on(...)`
  never loses them, and the runners they hold are the **decorated** ones, never `baseRegistry`'s.
  `EventedRegistryOf` = `IEventedRegistry & CommandRunnersOf`, an intersection because an interface cannot
  declare a mapped type over a generic key union.
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
- A reaction chain cycling back to a command key or event name already on its own chain throws
  `LoopDetectedException` (HTTP 508); for a cycle closing on an *event* specifically, `react()` routes it
  through `onError`/`defaultOnError` like any other reaction failure, preserving the never-reject
  guarantee.
- The emitter for a Node host is `NodeEventEmitterAdapter` (`@roastery/beans/node`).

> Detail: [registry-gate-and-loop-guard.md](../../../docs/decisions/registry-gate-and-loop-guard.md)
> · [way-barrel-scope.md](../../../docs/decisions/way-barrel-scope.md)
