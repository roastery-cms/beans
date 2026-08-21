---
name: beans-blueprint-rules
description: Use when declaring or changing a blueprint's rules — `blueprint(shape).with({ default, derive })`, `.done()`, `RulesOf` / `PropertyRule` / `RuledKeys` / `RuledBlueprint` / `BlueprintBuilder`, the `Rules` symbol slot, `DomainKeys`, `UndefinedableKeys`, `applyRuleDefaults`, `rulesOf` — or when writing an `onSet` handler, or when a default, a derived value or an omittable key resolves differently than expected.
---

# Blueprint rules and `onSet`

The producing side (`default`/`derive`) and the checking side (`onSet`) of a blueprint. Both belong to
`Entity` and `DomainRecord`; `Command` has the rules but no `onSet`.

## Inviolable rules

1. **Every mapped type over a blueprint must go through `DomainKeys<Shape>`** (or its pillar's
   equivalent), or the `Rules` symbol slot leaks as an accessor, a schema field and a serialized key.
2. **A symbol used as a computed key is a *value* import.** `import type { Rules }` in a file that reads
   or writes `properties[Rules]` throws `ReferenceError: Rules is not defined` from inside `buildContext`
   — every construction breaks at once while the module graph loads fine.
3. **Rules act on input only** — never on `set`/`setMany`, never on `toJSON`, never on the schema.
4. **`{ default }` and `{ derive }` are mutually exclusive** per key.
5. **A rule-less blueprint closes with `.done()`**, never `.with({})` — an empty rule map reads like one
   left unfinished.
6. **An `onSet` handler enforces by throwing and never rewrites the value** — normalising is
   `transform`'s job, and a hook that could do both would make the two indistinguishable at the call
   site.


## The rules

`blueprint(shape).with(rules)` attaches per-property domain rules — `{ default }` (a fallback belonging to
the entity, outranking the VO's own) or `{ derive }` (computed from siblings). The two are mutually
exclusive.

```ts
const postTagProperties = blueprint({ name: TagName, slug: TagSlug, hidden: TagVisibility })
	.with({ slug: { derive: (raw) => raw.name }, hidden: { default: false } });

new PostTag({ name: "Alan Reis" }); // slug: "alan-reis", hidden: false
```

- **The rules live under the `Rules` symbol key on the blueprint object itself.** That is what makes the
  feature cheap: `Object.keys`/`Object.entries` skip symbols, so `modelFor`, `installAccessors`, `toJSON`
  and every other traversal keep seeing exactly the domain properties.
- **Ruled keys are optional in the constructor payload**, and so are **`undefined`-accepting keys**
  (`UndefinedableKeys`: any key whose VO's `value` type includes `undefined`, or an `optionalOf` wrapper).
  `null` is **not** picked up — a `nullableVO`/`nullableOf` key stays required.
- **Resolution is explicit value > `default` > `derive`**, all inside `buildContext`. Derivations run in
  **blueprint order** and read siblings already built and normalised (a `SlugVO` sibling reads back
  slugified); one reading a key derived later gets `undefined` and fails on that property's validation.
- **"Omitted" means `undefined`, not falsy** — an explicit `false`/`0`/`""` counts as supplied, which is
  what makes `{ hidden: { default: false } }` overridable with `true`.
- **Rules apply in `demo()`** — that is what makes fixtures coherent. Keys with no rule still go through
  the VO's `.demo()`.
- **Two phases because a literal cannot reference its own `typeof`.** `blueprint(shape)` alone returns
  **only** the builder, so forgetting to close it is a type error. **A rule-less blueprint closes with
  `.done()`**, which returns the shape *as given* — same object reference, no `Rules` slot. Do not write
  `.with({})`.

## `onSet`

A concrete, empty-by-default `protected` method on both `Entity` and `DomainRecord`, returning
`SetHandlersOf<Shape>`: at most one handler per blueprint key, run on the **raw** value immediately before
`buildProperty` materialises it — in `buildContext` (so `new`, `fromJSON` and `demo()` all go through it)
and in `setMany` (so `set` does too).

The handler returns `void` and enforces by **throwing**; it never rewrites the value, because normalising
is `transform`'s job. Its second argument is `Readonly<InputValuesOf<Shape>>` — the *same* view
`PropertyRule.derive` receives, because at construction time `[Context]` does not exist yet.

Four consequences, each a decision: a handler fires **only when there is a raw value to set** (explicit
payload, blueprint `default`, or `derive` result), which is why `demo()` fires only the derived keys; it
runs **before** the value-object validates, so the business rule precedes the schema; in `setMany` it runs
before the whole build phase, preserving the documented atomicity; and it fires **per attempted write**,
not per effective change.

**The class-field trap is only half-catchable here**: at construction `this.onSet` still resolves to the
base's empty prototype method with no trace of the field, so `readSetHandlers` throws
`InvalidEntityDefinitionException` on the first *mutation* instead. Documented, not engineered around.

`Command` gets no `onSet` — it never mutates, and its input failures are already re-tagged
`UnprocessableContentException` at its own boundary.


> Detail: [per-pillar-cycle-guards.md](../../../docs/decisions/per-pillar-cycle-guards.md)
> · siblings: skills `beans-domain-modeling`, `beans-command-pillar`
