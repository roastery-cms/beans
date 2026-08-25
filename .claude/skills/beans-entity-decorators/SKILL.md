---
name: beans-entity-decorators
description: Use when writing, editing or debugging anything in `src/domain/entity/decorators/` or any use of `@onCreate` / `@onUpdate` / `@onDelete` / `@emit` / `@onError`, when an entity should raise an event automatically at a lifecycle point or around a business method, when touching `EntityConstructor` / `EntityLifecycleDecorator` / `EntityMethodDecorator` / `BareDomainEventClass` / `EntityErrorEventFactory` / `renameDecorated` / `isBareEventClass` / `fromClass`, or when a TS2545 / TS2515 error appears in a mixin.
---

# Entity decorators

Five standard (TC39 Stage 3) decorators, **not** `experimentalDecorators` — `tsconfig.json` does not
set that flag and TypeScript 5.9.3 supports the standard form natively.

- **Class decorators**: `onCreate`, `onUpdate`, `onDelete` — raise a declared event at a fixed
  lifecycle point.
- **Method decorators**: `emit`, `onError` — raise a declared event once an arbitrary instance method
  ran to completion, or when it threw.

```ts
@onCreate(UserCreated)
@onUpdate(UserUpdated)
@onDelete(UserDeleted)
class User extends entityOf(userProperties, "user") {
	@emit(OrderShipped)
	public ship(): void {}
}
```

## Inviolable rules

1. **`EntityConstructor` must target the narrow `EntityLike` slice**, never
   `abstract new (...args: any[]) => Entity<PropertiesShapeBase>` — the latter makes every decorated
   subclass fail against its own blueprint.
2. **The mixin base's rest parameter must be exactly `any[]`** (TS2545 otherwise), with a
   `biome-ignore lint/suspicious/noExplicitAny`.
3. **`class Decorated extends target` must be declared `abstract`** (TS2515 otherwise), and is always
   cast away with `as unknown as typeof target`.
4. **Reach `raiseEvent` through the inline cast**
   `(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(event)` — in both decorator
   shapes.
5. **A method decorator's replacement must be `const replacement: typeof target = function (...) {}`**
   — the function as the *direct initializer* of a `const` typed against `typeof target`, or `this`
   and `args` fall back to implicit `any`.
6. **Call the wrapped method as `target.apply(this, args)`**, never `target(...args)` — a bare call
   runs with `this === undefined` in strict mode.
7. **Every decorator copies the decorated name** via `renameDecorated`; a method decorator passes
   `String(context.name)`.
8. **Do not add an `onRead`/`onHydrate`.** Rebuilding from storage is not a domain fact, and the event
   would ride along in every `CommandResult`. Audit reads in the repository.
9. **Decorators do not apply to a `DomainRecord`** — all five end in `raiseEvent`, which a record does
   not have. Nothing guards this at runtime; `onUpdate` is the tempting one, since a record does have
   `setMany`.

## What each one wraps

- **`onCreate` wraps the constructor**, calls through via `super(...args)`, then runs the same
  `extractIdentity` (`../helpers/extract-identity`) the base constructor already ran, firing only when
  it returns `undefined` (a fresh payload). Calling it a second time is redundant but safe: a malformed
  identity would already have thrown `IncompleteIdentityException`. `.demo()` needs no special case —
  destructuring `id`/`createdAt`/`updatedAt` off the `Demo` symbol yields `undefined` for all three, so
  it falls into the same "no identity" branch.
- **`onUpdate` wraps `setMany` only** — `set` delegates to `this.setMany(...)` and JS dispatch resolves
  that through the real prototype chain, so overriding `setMany` catches both. It fires only when
  something actually changed, read off **`setMany`'s own `boolean` return**. Comparing `updatedAt`
  before/after looks equivalent and is not: the stamp is an ISO string with millisecond resolution, so
  two distinct mutations in the same millisecond would compare equal and the second event would be
  swallowed.
- **`onDelete` wraps `destroy()`**, checking `isDestroyed` *before* delegating to `super.destroy()` so a
  repeated call doesn't raise twice.
- **`emit` raises after the method returns.** No `try`/`catch`: if the method throws, the `raiseEvent`
  written after the call simply never executes and the exception propagates untouched. A declared
  payload is therefore cut from the **post-method** state; `onCreate`'s is cut after `super(...args)`
  returned, so derived keys are already resolved, and `onDelete`'s before `destroy()` took effect.
- **`onError` is the one decorator that catches.** It wraps the call in `try`/`catch`, calls
  `eventFactory(error)`, raises what it returns, then **always re-throws** the original error. The
  event is a side channel only, never a way to swallow a failure.

## Event argument forms

The three class decorators and `emit` accept the **bare-class form only**
(`BareDomainEventClass = new (aggregateId: string) => IDomainEvent`) — a decorator is declared once,
with no per-call payload to build an instance from.

**That constraint survived the event payload, and is why nothing here changed.** An event may declare
`static readonly payload` (a shape, `Json` or `SafeJson`), but the payload comes from the *entity*,
resolved by `raiseEvent` at the moment of the raise — never from the constructor. So a
payload-carrying event is still `new (aggregateId: string)`, still a `BareDomainEventClass`, and
`@emit(OrderShipped)` takes no second argument. **Do not add one**: the declaration lives on the event
class and nowhere else, or the two sources diverge in silence. Skill `beans-domain-events`.

`onError` additionally accepts a factory, `EntityErrorEventFactory = (error: unknown) => IDomainEvent`,
because its error is genuinely call-time data. The bare-class form is accepted too, purely for reading
the same way the others do.

The two forms are told apart by `decorators/helpers/is-bare-event-class.ts`, **not `typeof`** — both a
class reference and a factory are `typeof === "function"`. It reads the own property descriptor of
`prototype`: an ES2015 `class`'s `prototype` is spec-mandated non-writable (ECMA-262 §15.7.14), an
ordinary `function`'s is writable, an arrow function has no own `prototype`. `writable === false` means
"a class". Verified directly against the runtime (Bun/JavaScriptCore) — it is the one place in the
package leaning on a JS engine internal rather than a duck-typed check. A detected bare class is
normalized through `fromClass` (`decorators/helpers/from-class.ts`, also public) before dispatching.

Since `Entity.raiseEvent` always overwrites `occurredAt`/`aggregateId` on the way into the buffer, a
factory is free to spend its constructor arguments entirely on the event's own payload and pass any
placeholder for `aggregateId`.

## Stacking, and the restrictions

- **Stacking works without coordination.** Each class decorator overrides only its own method and
  delegates the rest via `super`, so order doesn't matter for correctness (TC39 applies them bottom-up).
- **`emit` and `onError` on the same method are mutually exclusive per call, by construction** — a clean
  run reaches only `emit`'s raise; a throw reaches only `onError`'s. Two stacked `emit`s both fire, the
  one closest to the method first.
- **Neither method decorator awaits a `Promise`.** On an `async` method, `emit` raises as soon as the
  synchronous call returns. No `Entity` method in this package is `async` today — a documented
  restriction, not an observed gap.
- **Instance methods only, not enforced at runtime.** Decorating a `static` compiles but fails at the
  `raiseEvent` cast at call time.
- **`EntityMethodDecorator` takes `<This, Args extends unknown[], Return>`** — `unknown[]`, not `any[]`:
  with no mixin base here, none of the TS2545/TS2515 traps apply. Not re-exported from
  `decorators/types/index.ts`; `EntityErrorEventFactory` and `BareDomainEventClass` are.
- **`emit` shares its name with `IEventEmitter.emit` and `onError` with the `commands` registry's `onError`.**
  Different layers, different contracts, no ambiguity in the module graph — each lives behind its own
  subpath. Say so in the TSDoc when touching either.

## Helpers that stay inline

There is no shared bracket helper. `construction-lifecycle-decorator.ts` (once serving `onCreate` and
`onRead`) and `methodHandleDecorator` (once serving `beforeHandle`/`afterHandle`) were both deleted when
they dropped to one consumer; their logic lives inline in `on-create.decorator.ts` and
`emit.decorator.ts`. Do not reintroduce the indirection.

> Detail: [decorator-mixin-traps.md](../../../docs/decisions/decorator-mixin-traps.md)
> · [event-payload.md](../../../docs/decisions/event-payload.md)
> · [typescript-traps.md](../../../docs/decisions/typescript-traps.md)
> · [removed-features.md](../../../docs/decisions/removed-features.md)
