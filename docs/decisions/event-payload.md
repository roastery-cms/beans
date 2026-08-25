# Domain-event payload: what an event carries, and who declares it

**Status:** closed. **Origin:** written on 2026-08-25, when `domain-event/` stopped being the one
pillar that was not blueprint-driven.

`DomainEvent` used to be `{ name, occurredAt, aggregateId }` and nothing else. `defineDomainEvent(name)`
generated a payload-less class, and the four raising decorators accepted only `BareDomainEventClass`,
so the decorated path could emit nothing but an empty event. Payload *worked* through `raiseEvent` —
its signature is structural — but only as a raw object literal: no schema, no value objects, no
`fromJSON`, no redaction. Every other boundary in the package refuses unvalidated data; the event was
the one place it passed free. That matters most because `IEventEmitter` exists to cross a bus, and the
far side had nothing to check against.

An event class may now declare `static readonly payload`, in one of three forms.

## The payload is not a blueprint-driven instance

The obvious design — an event shaped like `Command`, with `[Context]`, accessors and a schema — is
the one that cannot work. `Entity.raiseEvent` buffers with a spread:

```ts
this[Events].push({ ...built, ...(payload === undefined ? {} : { payload }), occurredAt, aggregateId });
```

and `installAccessors` puts every blueprint accessor on the **prototype**, `enumerable: false`. A
blueprint-driven event would therefore lose its entire payload in that spread, silently. The same
spread is why `.on()` matches by `name` and never by `instanceof`.

So the class only *declares* the format. The payload is a plain object, resolved from the raising
entity at the moment of the raise and placed under a `payload` key on the buffered DTO — which is what
an `IEventEmitter` publishes and a reaction's `handle` receives. `DomainEvent` carries a `declare`
field for it, emitting nothing: a constructed instance genuinely has no payload, and the type has
always described the buffered form rather than the instance.

## Three decisions

### 1. The declaration lives on the event class, and nowhere else

The decorators take no second argument — they read the static off the class they already receive. A
second place to declare it would be a second source, free to diverge from the first in silence.

It is also what makes the far side possible: `.on(OrderShipped, Handler)` already hands the consumer
the same class, so `OrderShipped.fromJSON(received.payload)` closes the loop with one declaration.

The rejected alternative, "the handler declares its own blueprint", needs no new code at all —
`recordOf(shape, name).fromJSON(payload)` already does it — and that is exactly its problem: two
shapes, two declaration sites, nothing keeping them in step.

Because the payload comes from the entity and not from the constructor, a payload-carrying event is
**still** a `BareDomainEventClass`. That is what let all four decorators accept one with no signature
change, and it is what keeps this feature small.

### 2. Only the shape form validates on arrival

`Json` and `SafeJson` produce the raising entity's whole serialization, and an event class does not
know which entity raised it — there is no static format to check an arrival against. Only the shape
form gets `fromJSON`.

The asymmetry is the argument for preferring a shape, the same way `sensitive: true` on a value
object being the only declaration that closes a repository port is the argument for preferring it
over a per-aggregate list. Making `Json`/`SafeJson` validate too would mean binding an event class to
a specific entity class — a coupling an event does not otherwise have.

### 3. The shape form drops the root's identity; the directives do not

`aggregateId` already carries the raising entity's `id`, and `createdAt`/`updatedAt` describe the
entity rather than the event. A **nested** aggregate keeps its identity, which is what makes the
payload hydratable one level down.

`Json` and `SafeJson` keep everything, root identity included, because the directive means *the
entity's serialization* — trimming it would make `Json` a lie about what it carries, and would break
a consumer feeding it straight into that entity's own `fromJSON`.

This is also why the validator derives its model from the **record** pillar's `modelFor` rather than
the entity's: a record model seeds an empty `t.TProperties` while delegating a nested entity key to
the entity's `modelFor`, which seeds the three identity fields. That is exactly the produced shape,
with no new schema machinery.

## The shape is an allowlist, and nothing in it is redacted

`reshapeTo` cuts from `toJSON()`, never `toSafeJSON()`, so the payload stays hydratable — which means
a key marked `sensitive` and named in a shape goes onto the bus in the clear. Leaving it out of the
shape is how it stays out. That is the point of declaring one: an allowlist beats a denylist here,
because a field nobody remembered to mark `sensitive` is still absent from a shape nobody added it to.

`SafeJson` is the denylist form, and it does redact — at the cost of the round trip. A redacted
payload does not come back through `fromJSON`, so that form is for consumption and audit, never for
hydration.

## `Json` and `SafeJson` are sentinels here, not slots

Both come from `@roastery/terroir/symbols` (0.2.2). `beans` uses them the way `Demo` is used in
`command.ts` — as sentinel values, discriminated from a shape by `typeof declaration === "symbol"`,
since a shape is always an object. `Json` resolves to `entity.toJSON()` and `SafeJson` to
`entity.toSafeJSON()`; **neither keys a member on `Entity`, `DomainRecord` or `ValueObject`.**

Terroir's own TSDoc for the two describes something wider: slots of a payload form deliberately
separate from `toJSON()`, with the audience chosen by the emitter (an in-process handler reading
`Json`, a transport reading `SafeJson`). That intention is not exercised here. In `beans` the event
class fixes the form, and reaction and transport read the same one — decision 1 again. Adopting the
terroir reading would be a different change: two new members on `Entity`, and `commands.ts` /
`IEventEmitter` choosing a form at publication.

The declaration itself is a plain `static`, not a ninth symbol, following `static readonly definition`
and `static readonly transactional` — see
[transactional-boundary.md](transactional-boundary.md) for why a flag a static already carries is not
worth a change to another package.

> Siblings: [redaction-asymmetry.md](redaction-asymmetry.md) ·
> [exception-layer-split.md](exception-layer-split.md) ·
> [transactional-boundary.md](transactional-boundary.md)
