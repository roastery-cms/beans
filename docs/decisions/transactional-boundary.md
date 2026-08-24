# Where the transaction goes, and why it is a marker

**Status:** closed. **Origin:** `docs/plans/transactions-and-use-cases.md`, implemented 2026-08-24.

The canonical Unit of Work (Fowler; EF Core's `DbContext`, Hibernate's `Session`) bundles four
things. `beans` already covered two in shapes of its own, refuses one on purpose, and this decision
is about the fourth:

| Axis of the canonical UoW | Situation in `beans` |
| --- | --- |
| Scope of the business operation | ✅ `Command`/`AggregateCommand` — `execute()` is the only place I/O belongs |
| Flush of effects at commit | ✅ `raiseEvent` → `pullDomainEvents` → `CommandResult` → `commands` publishes |
| Atomicity (one transaction per operation) | ✅ **this document** |
| Change tracking + identity map | ❌ **refused, and not to be reopened** |

## Change tracking is out

- `toJSON` is **recursive**: the persistence unit here is the whole aggregate serialized, not
  normalized rows. That cancels both of dirty checking's real wins — `UPDATE` of only the changed
  columns, and FK ordering across tables. What would be left is saving one `await repo.update(x)`
  per use case.
- The price would be `testing/`'s strongest guarantee. `inMemoryRepositoryOf` implements **the same
  `RepositoryOf` port** a real adapter does, and stores `toJSON()` while rehydrating through
  `fromJSON` on every read *precisely* so the "I forgot to call `update`" bug fails in the test.
  With tracking, the double and the real adapter diverge, `toBe` starts holding, and `update` ends
  up with two meanings on one port.
- If the discomfort is forgetting the `update`, that is a test, not an architecture — and the test
  already exists.

## It is not in `Command`

Four reasons, and the third is the one that would have hurt:

1. The base would have to guess the runner by naming convention (`deps.uow`) — a magic string in a
   package where everything else is structural and derived from the blueprint. `Deps` has **no
   runtime footprint** (no symbol, unlike `Properties`/`Context`), so the base cannot *derive*
   anything from it.
2. Read-only commands would open `BEGIN`/`COMMIT` for nothing — a pooled connection held and extra
   round-trips on every query path.
3. Nesting becomes a **silent failure**: if every `execute` opens a transaction, a command calling
   another opens two, and the inner rollback never reaches the outer unless the adapter is
   reentrant. Nothing would say so. This package has exactly one silent failure mode today
   (forgetting `interface X extends AccessorsOf<…> {}`), and `CLAUDE.md` treats that as notable.
4. `execute()` would stop being predictable, and `application/command` would gain its first notion
   of persistence.

## The two halves

`@transactional` declares **who** needs a boundary; `commands`' `transaction` option supplies
**how** to open one. Only a marked key is wrapped, so `FindUserByEmail` never sees a `BEGIN` — no
predicate, no exception list, no `only:` parameter (which was considered and became unnecessary).

The decorator stamps `static readonly transactional = true` and does nothing else. Direct precedent:
`commandOf`/`aggregateCommandOf` already stamp `static readonly definition`, read afterwards by
`readBoundDefinition`. **No local symbol** — if a real slot is ever wanted, it gets asked of terroir,
the way `Events` and the five exceptions were.

Semantic precedent: **`meta.unique`**. It is declarative, construction never fails because of it,
and the port's adapter is what enforces it. `@transactional` has exactly that semantics, including
the consequence below.

## A marker without a runner is not an error

It runs exactly as it would unmarked. That is a requirement, not an oversight: a test wired with
`inMemoryRepositoryOf` must need no ceremony to exercise a command whose production registry is
transactional.

The net against "I marked it and assumed I was covered" is the one `unique` uses — keep the
declaration readable. `transactionalKeysOf(spec)` mirrors `uniqueKeysOf(EntityClass)` so anyone
wanting rigor fails at bootstrap rather than in production:

```ts
if (!transaction && transactionalKeysOf(spec).length > 0)
    throw new Error("transactional commands registered without a runner");
```

| | registry without `transaction` | with `transaction` |
| --- | --- | --- |
| undecorated | runs directly | runs directly |
| `@transactional` | runs directly (degraded) | runs inside the transaction |

## The boundary wraps `execute()` and nothing else

In `buildCommands` (`application/commands/commands.ts`):

```ts
const outcome = boundary ? await boundary(work) : await work(); // ← the transaction wraps ONLY this
for (const event of outcome.events) {                           // ← and none of this
    await emitter?.emit(event);
    await react(event, nextChain);
}
```

Order: **`COMMIT` → `emit` → reactions.** On failure `work` rejects, the loop never starts, nothing
is published. Wrapping `registry.get(key)` from outside would give the wrong order
(`transaction( execute + emit + reactions )` — an e-mail inside the transaction), which is why the
option lives *inside* the registry rather than in a wrapper around it.

Construction stays outside too: `new CommandClass(payload)` only validates input, and a
`BadRequestException` is not worth a `BEGIN`/`ROLLBACK` round-trip.

## Nesting is threaded explicitly, never derived from `chain`

`buildCommands(chain, inTransaction)` carries the answer:

- root bag → `false`
- a command's own bag → `inTransaction || it just opened one`
- a **reaction's** bag → `false`, because the event loop runs after the raising command committed

Deriving it from `chain` was the first idea and it is wrong. The chain mixes `command:` and `event:`
nodes, and a command dispatched by a reaction has a `command:` ancestor *and* must open its own
boundary. "Am I nested?" and "is a boundary already open?" only coincide while there are no
reactions.

The two effects the design wanted both survive: a nested command inherits the boundary (so **the
adapter never has to be reentrant** — that was trap 3 above), and a reaction-dispatched command
opens its own (a reaction must not be able to roll back what already committed).

## `transaction` is on both overloads, and the evented one is declared first

The option lives on `CommandsOptions`, which `EventedCommandsOptions` extends. Publication and
atomicity are orthogonal problems, so `commands(spec, { transaction })` — a boundary with no bus in
sight — has to be writable; putting `transaction` next to `emitter` would have made it impossible.

`emitter` stays **required inside** `EventedCommandsOptions`, since it is what separates the two
overloads. The evented overload is declared **first** so `{ emitter, transaction }` resolves to the
registry that has `.on()`; the other order would have handed it back without one. The runtime gate
for installing `.on()` is therefore `emitter`, not `options` — which is what keeps a spec key
literally called `on` installable in `commands(spec, { transaction })`.

### `transaction` is required, and that is an IntelliSense decision

The first version made `transaction` optional on `CommandsOptions`, which made `commands(spec, {})`
a valid call — and broke discovery of the whole evented half. **TypeScript computes an argument's
completions from the overload that *matches*.** An empty literal matched the events-free overload,
so opening the brace offered `transaction` alone and `emitter`/`onError` never appeared. Measured,
not guessed, with `getCompletionsAtPosition`:

| options type of the events-free overload | completions in `commands(spec, { │ })` |
| --- | --- |
| `{ transaction?: … }` | `transaction` |
| `{ transaction: … }` (required) | `emitter`, `onError`, `transaction` |

Requiring the key means `{}` matches **neither** overload, and the completion list becomes the union
of both. Narrowing then works from either direction: after `{ transaction, │ }` the editor offers
`emitter`/`onError`, and after `{ emitter, │ }` it offers `onError`/`transaction`.

The cost is that `commands(spec, {})` is now a compile error, which is the right answer anyway — it
is `commands(spec)` written the long way. A caller whose boundary only sometimes exists branches at
the call site, exactly as one whose emitter does. `EventedCommandsOptions` picks the key up through
`Partial<CommandsOptions>`, since there `emitter` already justifies the argument.

Consequence worth remembering if a second events-free option is ever added: "required" stops being
the right encoding at that point (it would have to become "at least one of"), and the shape that
solves it is a union — not going back to all-optional, which reintroduces exactly this problem.

## The contract, and what is not in it

Type-only, in `domain/repository/types` (whose `dist` output must stay 0 bytes):

```ts
export interface ITransactionRunner {
    run<T>(work: () => Promise<T>): Promise<T>;
}
```

Never `IUnitOfWork`. Someone arriving with EF Core or Hibernate behind them reads that name and
expects `user.rename("x")` inside a `handle` to be saved by the commit. It is not. The name would
invite exactly the bug the in-memory double was built to catch — the same criterion that separates
`EntityStorage` (a class) from `Storage` (a symbol), and that produced five specific exceptions
instead of `OperationFailedException`.

The adapter lives **outside** `beans`. The piece that actually puts repositories inside the
transaction is `AsyncLocalStorage`: without it the repository writes through the global connection,
the `ROLLBACK` never reaches the `INSERT`, and inconsistent state ships with a false sense of
protection.

```ts
const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();

class PrismaTransactionRunner implements ITransactionRunner {
    async run<T>(work: () => Promise<T>): Promise<T> {
        return this.prisma.$transaction((tx) => transactionContext.run(tx, work));
    }
}

class PrismaUserRepository {
    private get db() {
        return transactionContext.getStore() ?? this.prisma; // inside? use the tx
    }
}
```

In tests, a one-line no-op still works: `{ run: (work) => work() }`. It proves the *ordering* and
nothing else, though — for a test that asserts what a rollback actually undoes, `beans` ships
**`inMemoryTransactionOf(...repositories)`** in `@roastery/beans/testing`, which implements this very
port over the stores behind `inMemoryRepositoryOf` and restores them when the work rejects:

```ts
const users = inMemoryRepositoryOf(User);
const runner = inMemoryTransactionOf(users);

commands(spec, { transaction: (work) => runner.run(work) }).withDependencies({ users });
```

It rolls back **rows, never entities** — change tracking is still refused, above — and a nested `run`
joins the open transaction rather than opening a second one.

`commands`' option is a **function**, not this object — `(work) => runner.run(work)` — so nothing in
`application/` names a `domain/repository` type, and an adapter of any shape fits.

## Left open

- **`transaction: { run, all: true }`** — inverting to "everything transactional by default, the
  decorator marking exceptions". Not implemented; the chosen shape does not close that door.
- **Cost of `BEGIN`/`COMMIT` in marked commands that only read** — solved by decorator selection,
  but worth measuring if it shows up.
- **Outbox.** Commit and `emit` are still two steps; a process dying between them loses the event.
  Out of scope — it fits in `CommandResult` without changing anything in `beans`, when and if it is
  needed.
