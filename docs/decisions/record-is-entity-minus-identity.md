# `DomainRecord` is an `Entity` minus identity — and how the pillars stay untangled

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`DomainRecord` (`domain/record/record.ts`, also home to `BoundRecord`, `recordOf`'s internal
base) is **an `Entity` minus identity**: no `id`/`createdAt`/`updatedAt`, no `IRawEntity`, no
`IdentityInput`, no repository port derived from it — but everything else, *including*
mutation, which is what separates it from `Command`.

`set`/`setMany` are `protected` exactly as on `Entity`, so a record changes only through the
domain verbs its subclass names; it exists for the composite values that deserve behaviour
(`Money`, `Address`, `DateRange`) rather than being flattened into a `customObjectVO`.
`recordOf(properties, source, extra?)` is `entityOf`'s twin.

It **raises no domain events** (no `[Events]`, no `raiseEvent` — an event belongs to an
aggregate root, and a record has no `aggregateId` to report) but **does** implement
`pullDomainEvents`, purely as a forwarder: a record's blueprint may hold an entity, and the
deep form has to walk into it or that entity's buffer is stranded; the shallow form always
returns `[]`. No `[Storage]` and no `destroy()` — both exist for something with a lifecycle of
its own. `RecordDefinition` has no `unique`, since uniqueness is an invariant of a set of rows
and a record is never a row. `toJSON` does **not** redact and `toSafeJSON` does — `Entity`'s
asymmetry, not `Command`'s, because `toJSON` is still a round-trip contract.

Unlike `entity.ts`, `record.ts` carries almost no construction machinery — `buildContext`,
`modelFor` and the definition readers are ordinary internal modules under `helpers/`, which is
possible *because* every property discriminant is structural.

## Four property kinds, and how the pillars stay untangled

A blueprint value may be a `ValueObject`, an `Entity`, a `DomainRecord` class **or** a
multiplicity wrapper around one of those three (`AnyPropertyClass`), and all three pillars'
blueprints admit records and wrappers alike. Four things make that work without the pillars
importing each other's classes:

- **The discriminants are structural, and live in `shared/helpers/`.** `isValueObjectClass`
  (tests `defineMeta`) was already there; `isEntityClass` (tests `defineEntity`) and
  `isRecordClass` (tests `defineRecord`) joined it, and `isEntityClass` **stopped being
  `prototype instanceof Entity`**. `protected` is compile-time only, so the methods are
  ordinary own properties of the prototype at runtime. Instance-side there is `isValueObject`
  plus `rawOf` (also `shared/`), and `rawOf`'s discriminant is **value-object or not**, never
  entity-versus-record — the two nested kinds serialize identically.
- **Only `modelFor` ever has to tell an entity from a record.** Construction, `demo`, `rawOf`
  and `get` treat them the same (both build from one payload argument, both expose a
  no-argument `demo()`), so `buildProperty` in all three pillars branches on
  `isValueObjectClass` alone. Schema derivation is the exception, and must be: the entity's
  `modelFor` hardcodes the three identity fields into its initial `shape`, so a record-valued
  key has to **delegate**, never recurse.
- **`modelFor` moved out of `entity.ts`** into `entity/helpers/model-for.ts` — possible only
  because `isEntityClass` is now structural and the function therefore needs no class. It and
  `record/helpers/model-for.ts` import each other, which is a deliberate and safe cycle: both
  are **class-free**, so the two functions reach each other at call time and never during
  module evaluation. `entity.ts` never imports `record.ts`, and nothing in `record/helpers/`
  does either — that is the rule that keeps `class BoundRecord extends DomainRecord` out of
  the cycle and `ReferenceError: … before initialization` out of the package. A second rule
  follows: **never import across pillars through a barrel** — `record/` reaches `blueprint` at
  `@/domain/entity/helpers/blueprint`, because `@/domain/entity/helpers`'s `index.ts` pulls in
  `entity-of.ts` → `entity.ts`.
- **`AnyEntity` and `AnyRecord` are disjoint by construction, not by branch order.** A record
  carries `toJSON`, `toSafeJSON`, `schema` **and** `pullDomainEvents`, so the two would
  otherwise be structurally identical and every conditional would silently depend on the order
  its branches happen to be written in. `AnyEntity` declares `readonly id: string`; `AnyRecord`
  declares `id`/`createdAt`/`updatedAt` as `?: never` — the mutual-exclusion idiom
  `PropertyRule` already uses for `default`/`derive`. Neither extends the other, so writing the
  entity branch first is a readability convention, unlike the genuinely order-sensitive
  `findManyBy…`-before-`findBy…` pair in `PerKeyRepositoryContractOf`.

The runtime half of that disjunction is the constructor guard: a record blueprint may not name
`id`/`createdAt`/`updatedAt`, and the constructor rejects them with
`PropertyNameCollisionException` before `installAccessors` runs (`installAccessors` could not
catch them, since a record has no such members to collide with).

## The `Record*` types are aliases where the pillars agree

`record/types/` spells the whole `Record*` vocabulary, but the ones describing *a blueprint
property* (`RecordPropertiesShapeBase`, `RecordDomainKeys`, `RecordRuledKeys`,
`RecordUndefinedableKeys`, `RecordConstructionValuesOf`, `RecordInputValuesOf`,
`RecordRawValueOf`, `RecordRulesOf`, `RecordSetHandlerOf`, `RecordSetHandlersOf`,
`SerializedRecord`) are one-line aliases of the entity pillar's.

That is not laziness: both blueprints admit exactly the same three property kinds, so two
independent copies would each have to reference the other and could not be kept in step — and
"a complete payload" has to mean one thing at every depth of an aggregate that mixes entities
and records. `record/types/record-type-parity.spec.ts` pins every alias with an `Equal<>`
assertion, which is what makes the arrangement safe.

What the pillar defines for itself is everything touching identity: `RecordContextOf` (no
`BaseContext`), `RawRecordContextOf` (no `IdentityInput`), `RecordSchemaOf` (no identity
fields), `RecordReadValueOf` (no `IRawEntity` branch), `RecordDefinition` (no `unique`), plus
`NestedRecordInput`, `RecordAccessorsOf`, `RecordClassOf` and `IRecord`.

## Known limitations

- The lifecycle and method decorators do not apply to a record (all five end in `raiseEvent`);
  `onUpdate` is the tempting one, since a record does have `setMany`. Nothing guards it at
  runtime, matching the pillar's stance everywhere else.
- Mutating a nested record does not stamp the parent's `updatedAt`. `post.price.add(500)`
  changes it in place; only `post.set("price", raw)` stamps. Identical to a nested entity, but
  far more visible, since a record exists *to* have verbs.
- A record that names a nested record or entity in `sensitive: [...]` does not redact it.
  `isSensitive` answers `true`, but `toSafeJSON` takes the recursive branch and the sub-object
  applies its own keys instead. Pre-existing behaviour, identical for a nested entity on
  `Entity`.
