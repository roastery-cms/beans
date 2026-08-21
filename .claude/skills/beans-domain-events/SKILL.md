---
name: beans-domain-events
description: Use when an entity should raise a domain event, or when working with `raiseEvent` / `pullDomainEvents` / the `[Events]` slot / `IDomainEvent` / `DomainEvent` / `defineName()` / `defineDomainEvent` / `DomainEventClassOf`, when events go missing from a nested entity, record or wrapper, or when deciding where events get published (`collectDomainEvents`, `CommandResult`, `eventedRegistry`).
---

# Domain events

`domain/domain-event/` is its own pillar, not nested under `entity/` — `IDomainEvent` is a plain data
contract, not entity-specific machinery — even though `Entity` is its only consumer today.

## Inviolable rules

1. **`raiseEvent` is `protected`** — a subclass calls it from its own business methods, never from
   `set`/`setMany`. It stamps `occurredAt`/`aggregateId` itself and does not accept them from the caller,
   so an event can never misreport which entity (or when) it came from. `beans` is not event-sourced, so
   there is no replay path that would need to override either.
2. **Only an `Entity` may raise.** A `DomainRecord` has no `[Events]` and no `raiseEvent` (an event
   belongs to an aggregate root, and a record has no `aggregateId` to report); a `Command` can only
   *collect* what an entity already raised.
3. **`pullDomainEvents()` is shallow by default** — pass `{ deep: true }` whenever a nested entity,
   record or wrapper may hold events.
4. **`defineName` must be a prototype method, never a class field, and must be pure** — same
   `InvalidEntityDefinitionException` guard as `defineMeta`/`defineEntity`, checked inline in the
   constructor rather than through a dedicated `read-*` helper, since nothing else needs to probe it
   without constructing.
5. **Call `defineDomainEvent` at module scope, once** — each call mints a fresh class, so two calls with
   the same name produce classes `instanceof` does not relate.
6. **Annotate `defineDomainEvent`'s return with `DomainEventClassOf`** — TS4060 otherwise.
7. **Matching a raised event against a registered handler is by `name`, never `instanceof`** —
   `raiseEvent` spreads the built event into a fresh plain object before buffering it.


- **`raiseEvent`/`pullDomainEvents` are the domain-event buffer**, backed by the `[Events]` slot
  (per-instance `IDomainEvent[]`, `protected`, **starts empty on `fromJSON`/`demo`**).
- **Prefer raising from the aggregate root.** An event raised inside a nested entity lands in that
  entity's own buffer, and `pullDomainEvents` is **shallow by default**. `pullDomainEvents({ deep: true })`
  opts into the recursion, walking `[Context]` root-first — the form to use whenever a nested entity
  carries lifecycle decorators, or when a record or wrapper stands between (both forward the deep pull;
  without it an entity inside an `arrayOf` would keep its events forever, the one completely silent failure
  in that feature).
- **`beans` ships no dispatcher** — `pullDomainEvents` only drains the buffer (`splice(0)`); what happens
  with the result is the consuming application's call. `collectDomainEvents` is the sanctioned way to gather
  it across aggregates.
- **A payload-less event class can be passed bare** (`raiseEvent(AuthorRenamed)`) — `raiseEvent` does
  `new event(this.id)` when `typeof event === "function"`. A subclass whose constructor needs more than
  `aggregateId` is not assignable to `new (aggregateId: string) => Event`, so TypeScript routes it to the
  "already built" branch and rejects the bare form — the constructor signature is the guard, no runtime
  check needed.
- **`DomainEvent` is optional sugar over `IDomainEvent`, not a second contract.** A subclass declares only
  `defineName()` and passes `aggregateId` through `super()`; the base stamps `occurredAt`. Because
  `raiseEvent` always overwrites `occurredAt`/`aggregateId`, a `DomainEvent` instance and a plain
  `{ name, ...payload }` object behave identically there — reach for the class when an event has payload
  fields of its own.
- **`defineDomainEvent(name)`** builds a payload-less `DomainEvent` class from just its name. Scope is
  deliberately payload-less only. Call it at module scope, once — each call mints a fresh class, so two
  calls with the same name produce classes `instanceof` does not relate. Its return is annotated
  `DomainEventClassOf` (TS4060), and the generated class's `.name` is set with the same two-line
  `Object.defineProperty` trick `defineValueObject` uses, copied inline rather than imported from
  `entity/decorators/helpers/` — that would be the first dependency from `domain-event/` back into
  `entity/`.


> Detail: [removed-features.md](../../../docs/decisions/removed-features.md) (no `onRead`/`onHydrate`)
> · siblings: skills `beans-domain-modeling`, `beans-entity-decorators`, `beans-command-registry`
