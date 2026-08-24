# What `@roastery/beans/way` curates, and why

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`way/` is **not** a third layer — it is one import path for the low-ceremony subset of the two
layers: `blueprint`/`entityOf`/`recordOf` (domain modeling, identified and not),
`arrayOf`/`optionalOf`/`nullableOf` (multiplicity), `defineDomainEvent` (events),
`defineUseCase` (a single-aggregate `AggregateCommand`, alias of `aggregateCommandOf`),
`commands`/`defineEventHandler` (orchestration and reactions), plus the
`IEventEmitter` and `RepositoryOf` types.

## One orchestration name, not two

`way` used to export both `commandRegistry` and `eventedRegistry`, because the evented one took a
*required* `IEventEmitter` and reaching for it forced a decision about where events go before the
reader had met domain events at all — a real step to climb on a path whose whole point is a gentle
slope. The events-free registry existed as the shallower first rung.

Merging them into `commands`, with the emitter optional inside `options`, removes the step without
keeping the second rung: `commands(spec)` asks nothing about events (and has no `.on()` to offer),
`commands(spec, { emitter })` is the same registry publishing and reacting, and a `CommandResult`
carries its `events` either way. Moving up is one argument, not a different name — which is also
why `way` no longer has to explain which of two functions to start with.

`RepositoryOf` is the port generator a `way`-built feature declares its persistence contract with,
while the granular `ICan*` capabilities it fuses stay behind `domain/repository/types`, the same
escape hatch every other precise form keeps.

## Collections live one level deeper

The value-object catalog lives at `way/collections/value-objects` (+ `/optional`, `/nullable`,
`/custom`), not in `way/index.ts` itself — flattened in there, its ~45 names would drown the
half-dozen that actually shape how a `way`-built feature is put together, the same split
`domain`/`application` already draw for their own catalogs.

`schemas` and `value-objects/custom/types` are deliberately excluded from both the barrel and the
parity spec, since a low-ceremony blueprint only ever needs the VO classes themselves.

## Nothing is reimplemented, and nothing is removed

`src/way/index.ts` contains zero logic — only `export { X } from "..."` lines — the same
"hand-kept alias, nothing reimplemented" deal `application/collections/*` already is for
`domain/collections/*`. Every name `way` exports is still reachable from its original subpath too;
`way` only adds a shorter path, it removes nothing.

`way/collections/collections-alias.spec.ts` (mirroring `application/collections/collections-alias.spec.ts`)
enforces both name parity (read from source) and reference identity at runtime between
`way/collections/**` and `domain/collections/**` — a redeclaration in place of a re-export would
keep every name lined up while breaking `instanceof`.

`commandOf`/`aggregateCommandOf`/`Command`/`AggregateCommand` stay reachable only through their own
subpath, as the escape hatch; `defineUseCase` is the one `application/command` name `way`
re-exports.

## The other two non-layers

`testing/` is a *time-of-use* concern and `node/` a *host* concern; neither is a layer either.
`node/`'s whole job is negative — by keeping every `node:*` import behind one subpath,
`domain`/`application` stay runtime-agnostic and usable from a worker or an edge function.
`src/node/` is the **only place in the package that imports a Node builtin**; `src/testing/`
imports none.

`NodeEventEmitterAdapter` used to live in `src/testing/`, which had the isolation right and the
address wrong: the adapter is production code (an app whose host is Node publishes through it),
and a subpath called `testing` said the opposite to every reader who never reached the TSDoc. Its
`inner` emitter is `public readonly` and defaults to a fresh one, since that is the only way to
subscribe (an `IEventEmitter` has no `.on` — the registry runs reactions through its own
registry, never through the emitter). It special-cases exactly one name: `"error"` is Node's one
reserved channel and emitting it with no listener throws `ERR_UNHANDLED_ERROR`, which — because
the registry `await`s `emit` inside the loop publishing a command's events — would reject the
`CommandResult` of a command that succeeded. The adapter returns early when nothing is listening
on `"error"`, which is behaviour-identical to every other name (a zero-listener emit is already a
no-op) and is not a dropped event.
