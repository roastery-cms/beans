---
name: beans-domain-events
description: Use when an entity should raise a domain event, or when working with `raiseEvent` / `pullDomainEvents` / the `[Events]` slot / `IDomainEvent` / `DomainEvent` / `defineName()` / `defineDomainEvent` / `DomainEventClassOf`, when events go missing from a nested entity, record or wrapper, or when deciding where events get published (`collectDomainEvents`, `CommandResult`, `commands`).
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
3. **`pullDomainEvents()` is deep by default** — it drains the root's buffer, then every nested entity,
   record and wrapper. `{ deep: false }` restricts it to the root's own.
4. **`defineName` must be a prototype method, never a class field, and must be pure** — same
   `InvalidEntityDefinitionException` guard as `defineMeta`/`defineEntity`, checked inline in the
   constructor rather than through a dedicated `read-*` helper, since nothing else needs to probe it
   without constructing.
5. **Call `defineDomainEvent` at module scope, once** — each call mints a fresh class *and*, with a
   shape, a fresh schema, so two calls with the same name produce classes `instanceof` does not relate.
6. **Annotate `defineDomainEvent`'s return with `DomainEventClassOf`** — TS4060 otherwise.
7. **Matching a raised event against a registered handler is by `name`, never `instanceof`** —
   `raiseEvent` spreads the built event into a fresh plain object before buffering it.


- **`raiseEvent`/`pullDomainEvents` are the domain-event buffer**, backed by the `[Events]` slot
  (per-instance `IDomainEvent[]`, `protected`, **starts empty on `fromJSON`/`demo`**).
- **Prefer raising from the aggregate root.** An event raised inside a nested entity lands in that
  entity's own buffer, which `pullDomainEvents` drains too: it is **deep by default**, walking `[Context]`
  root-first, and a record or wrapper standing between forwards the walk (without that forward an entity
  inside an `arrayOf` would keep its events forever, the one completely silent failure in that feature).
  `{ deep: false }` opts out, and is the form that strands a nested entity's events — including the ones a
  lifecycle decorator raises on its own construction.
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
- **`defineDomainEvent(name)`** builds a payload-less `DomainEvent` class from just its name. Call it at
  module scope, once. Its return is annotated `DomainEventClassOf` (TS4060), and the generated class's
  `.name` is set with the same two-line `Object.defineProperty` trick `defineValueObject` uses, copied
  inline rather than imported from `entity/decorators/helpers/` — that would be the first dependency
  from `domain-event/` back into `entity/`.

## The declared payload

```ts
const OrderShipped = defineDomainEvent("order.shipped", { code: StringVO, to: AddressCard });
const OrderAudited = defineDomainEvent("order.audited", SafeJson);
const OrderPlain   = defineDomainEvent("order.plain");                 // unchanged

@emit(OrderShipped)                                                    // no second argument
public ship(): void {}

OrderShipped.fromJSON(received.payload);                               // the far side
```

| Second argument | Payload buffered | `fromJSON` |
|---|---|---|
| *(omitted)* | none — no `payload` key at all | — |
| a shape | `reshapeTo(shape, entity)`, root identity dropped | yes |
| `Json` | `entity.toJSON()` | no |
| `SafeJson` | `entity.toSafeJSON()` | no |

### Rules

1. **The declaration lives on the event class, and nowhere else.** The four decorators take no second
   argument — they read `static readonly payload` off the class they already receive, structurally, the
   way `isTransactional` reads its marker. A second declaration site would be a second source free to
   diverge in silence, and it is the class the consumer already holds at `.on(Event, Handler)`.
2. **The payload is never a blueprint-driven instance.** `raiseEvent` buffers with `{ ...built, … }`
   and `installAccessors` puts accessors on the **prototype**, `enumerable: false` — a
   `Command`-shaped event would lose its whole payload in that spread, silently. The class only
   declares; `eventPayloadOf` resolves against the entity and the result goes under a `payload` key on
   the buffered DTO. `DomainEvent`'s `payload` is a `declare` field, emitting nothing.
3. **The shape is an allowlist, and nothing in it is redacted.** `reshapeTo` cuts from `toJSON()`, never
   `toSafeJSON()`, so a `sensitive` key named in a shape goes onto the bus in the clear. Leave it out.
   `SafeJson` is the redacting form — and a redacted payload does **not** round-trip through `fromJSON`,
   so that form is for consumption and audit, never hydration.
4. **Only the shape form validates on arrival.** `Json`/`SafeJson` carry the whole serialization and an
   event class does not know which entity raised it, so there is no static format to check. The
   asymmetry is the argument for preferring a shape.
5. **A payload shape is blueprint-compatible, not a full `ReshapeShapeBase`** — classes only, no
   anonymous nested target. The same object has to serve as the cut's target *and* the validator's
   blueprint, and an anonymous target carries no schema.
6. **A payload-carrying event is still a `BareDomainEventClass`** — the constructor stays
   `new (aggregateId: string)`, because the payload comes from the entity. That is why no decorator
   changed.
7. **The validator uses the *record* pillar's `modelFor`**, which seeds no root identity while
   delegating a nested entity key to the entity's, which seeds its own — exactly the produced shape.
   It derives a schema and returns the plain object; it never mints a class, so the payload stays wire
   data and the shape's keys never hit `installAccessors`.
8. **`Json`/`SafeJson` are sentinels here, not slots** — `typeof declaration === "symbol"`
   discriminates them from a shape. Neither keys a member on any base. Terroir's TSDoc describes a
   wider intention that `beans` does not exercise; see the decision doc.


> Detail: [event-payload.md](../../../docs/decisions/event-payload.md)
> · [removed-features.md](../../../docs/decisions/removed-features.md) (no `onRead`/`onHydrate`)
> · siblings: skills `beans-domain-modeling`, `beans-entity-decorators`, `beans-commands`
