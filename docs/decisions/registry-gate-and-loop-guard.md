# The registry gate is compile-time only, and the loop guard is its runtime backstop

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`commandRegistry(spec).withDependencies(dependencies)` gates `.get(key)` to only the commands
in `spec` whose declared `Deps` `dependencies` structurally satisfies — resolved entirely at
compile time.

**Two-phase for the same reason `blueprint` is.** A literal cannot reference its own `typeof`,
so `Spec` is fixed by the `commandRegistry(spec)` call before `withDependencies`'s
`Dependencies` can be checked against every spec member's `Deps` in the second.

## The gate has no runtime footprint

`Deps` has zero runtime footprint (no symbol slot, unlike `Properties`/`Context`/`Source`), so
"only registrable if its dependencies are present" can only exist as a type-level constraint:
`RegistrableKeys<Spec, Dependencies, WithCommands = true>` maps every spec key to itself-or-
`never` (the same `UndefinedableKeys`-style "map then index-collapse" idiom
`domain/entity/types` already uses) and collapses to the union of keys `.get()` accepts.

**The runtime installs every spec key; the type exposes only the registrable ones.** That is not
a leak, it is the gate's existing posture — a caller who bypasses TypeScript already reached a
withheld key through `.get(key as never)`, and faces no runtime check: `execute()` just receives
whatever `dependencies` was, missing keys and all.

## `WithCommands` is a depth flag, and it replaced a whole second type

There used to be a near-identical `DirectlyRegistrableKeys` differing only in checking against
the raw `Dependencies` instead of `AugmentedDependencies`, which is exactly "the same question
one hop shallower". `RegistrableKeys<Spec, Deps, false>` is that type now, and `SiblingCommands`
builds its key set from it; the recursion terminates because
`AugmentedDependencies<Spec, Deps, false>` *is* `Dependencies` and reaches for nothing further.

It must always be instantiated with a literal `true`/`false` — `boolean` is `true | false`, and
a conditional over a naked type parameter distributes across a union, which would collapse both
branches and silently uncap the depth.

## `Deps = void` has two different `infer` outcomes

Every no-deps command in this package elides `execute`'s parameter entirely
(`public async execute(): Promise<CommandResult<X>>`) rather than writing `execute(deps: void)`
— and eliding it means `DepsOfClass`'s `infer` has no parameter position to constrain against,
so it resolves to `unknown`, not `void` (TypeScript's contravariant-inference fallback is the
top type). Only the explicit `execute(deps: void)` form resolves to `void` itself.

`RegistrableKeys` special-cases both (`unknown extends DepsOfClass<...>` and
`DepsOfClass<...> extends void`), since either means "reads nothing from `execute`'s argument"
and must be registrable regardless of what `Dependencies` is.

`AggregateCommand` has one harmless inference nuance for the same reason: because `execute`'s
parameter is always named there (it forwards to `handle(deps)`), a `Deps = void` command built
on it resolves through `DepsOfClass` as `void` rather than `unknown` — `RegistrableKeys` already
treats both outcomes identically, at either depth, precisely for this.

## The check is structural, not exact

`execute` is method shorthand (matching `ICommand`), and TypeScript exempts method shorthand from
`strictFunctionTypes`'s contravariant parameter checking (deliberately, for OOP covariance). A
`Dependencies` record whose nested method-shaped member is only bivariantly compatible with what
a command's `Deps` declares can satisfy `RegistrableKeys` without truly being a safe substitute.
Not fixable from inside `command-registry/` without changing `Command`/`ICommand` itself, which
is out of scope — documented, not engineered around, matching the "nothing stops a caller who
bypasses TypeScript" stance already taken for the gate itself.

## The loop guard backs the gate independently of it

`RegistrableKeys` still only *proves* one hop; the `commands` bag it feeds stays unlimited in
depth, so `withDependencies` builds it via a `buildCommands(spec, dependencies, chain)`
recursion instead of one flat shared object — `chain` is a `ReadonlySet<string>` of command keys
already on the current call chain, threaded fresh (not mutated) into every nested `execute()`'s
own `commands`. A key that shows up again in its own chain throws `LoopDetectedException`
(HTTP 508, from `@roastery/terroir/exceptions/application`) instead of recursing until the stack
overflows.

The chain is rebuilt per call rather than tracked in one shared, mutable `Set` (the
`deriving`/`constructing` pattern `domain/entity` uses for blueprint cycles) specifically because
`execute()` is async: a shared mutable guard cannot tell two unrelated *concurrent* calls to the
same key apart from a real cycle, since the first call's in-flight marker would still be set when
the second, unrelated call checks it. Two sibling calls to the same key from different branches of
a chain — not nested inside one another — correctly stay unflagged, the same "siblings, not a
cycle" distinction the entity guard already draws.

`eventedRegistry` carries the same guard for reactions: a reaction chain that cycles back to a
command key or event name already on its own call chain throws the same `LoopDetectedException`;
for a cycle closing on an *event* specifically, `react()` routes it through
`onError`/`defaultOnError` like any other reaction failure instead of throwing, preserving the
"never rejects the `CommandResult`" guarantee.

## Where the types live

`AnyCommandClass`, `CommandRegistrySpecBase`, `CommandRunner`, `DepsOfClass`, `PayloadOfClass`
and `ResultOfClass` live in `application/command/types/`, not in the registry pillar, and
`command-registry/types` re-exports the three public ones so its own subpath still serves them.
All six describe a *command class*, which is that pillar's vocabulary — and a command's own
`Siblings` declaration needs them at the `defineUseCase` call site, long before any registry
exists. Leaving them in the registry would have made `application/command` import from
`application/command-registry`, which already imports `CommandResult` back from there: a cycle
between the two pillars.

`DepsOfClass`/`PayloadOfClass`/`ResultOfClass` stay off the `command/types` barrel exactly as they
stayed off the registry's own. `AnyCommandClass` is still built entirely from `CommandResult`. All
three recover their target type via `infer` on the concrete class substituted for
`AnyCommandClass`'s `never`-bounded `execute`/constructor slots, the same "widest structural bound,
recover specifics via `infer` later" idiom `AnyValueObjectClass`/`AnyEntityClass` already use.

## Sibling commands: why `Siblings` is given rather than inferred

A use case is declared before the `commandRegistry` that registers it exists, so `typeof spec`
would be circular. `SiblingCommands` (registry side) *computes* its keys from the spec;
`WithSiblingCommands` (declaration side) is *given* them. Same bag, opposite directions.

- **The default must be `Record<never, never>`, not `Record<string, never>`.** The guard is
  `[keyof Siblings] extends [never]`, and `keyof Record<string, never>` is `string`, not `never`
  — that default would hand every command a `commands: { [k: string]: … }` it never asked for.
  Written in tuples so the check is not distributed, the same non-distributive idiom
  `RepositoryOrderKeysOf` uses.
- **That guard is load-bearing, not tidiness.** With `Siblings` empty the type must resolve to
  `Deps` *itself*, never `Deps & { commands: {} }`: an always-present `commands` key changes what
  `DepsOfClass` infers for every command in existence, and for a `Deps = void` command the
  intersection is the uninhabited `void & { commands: {} }`, which quietly breaks
  `RegistrableKeys`'s `extends void` branch.
- **The gate needed no change at all.** A class built this way resolves `DepsOfClass` to the same
  shape a hand-written `Deps` used to spell out, so `RegistrableKeys` keeps checking exactly what
  it checked before — a sibling only reachable *through* another sibling's `commands` is still not
  provably safe, and `.get()` still withholds it. Same for `RegistrableEventHandlerClass` on the
  reaction side.
