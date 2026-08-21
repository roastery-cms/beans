---
name: beans-custom-vo-factories
description: Use when writing or editing anything in `src/domain/collections/value-objects/custom/`, when calling or changing `defineValueObject`, `customStringVO`, `customNumberVO`, `customArrayVO`, `customObjectVO`, `customRecordVO`, `customEnumVO`, `customBinaryVO`, `optionalVO`, `nullableVO` or `unionVO`, when a blueprint needs an inline constrained value object instead of a schema plus a subclass, when adding a `validate`/`transform` hook to a generated VO, or when a factory hits TS4060 on build.
---

# Custom value-object factories

`domain/collections/value-objects/custom/` ships functions that **return a VO class**, so a blueprint
can carry a constraint inline instead of a schema plus a subclass per rule. Subpath:
`@roastery/beans/domain/collections/value-objects/custom` (types one level deeper, under `/types`;
also reachable via the `application/collections/…` and `way/collections/…` aliases).

`defineValueObject({ schema, default, name?, transform?, validate? })` is the core; `customStringVO`,
`customNumberVO`, `customArrayVO(items, args?)`, `customObjectVO(properties, args)`, `customRecordVO`,
`customEnumVO(values, args?)`, `optionalVO(schema, args?)`, `nullableVO(schema, args?)`,
`unionVO(schemas, args)` and `customBinaryVO(args?)` are thin wrappers that only build the schema and
delegate.

This works because the blueprint machinery is **entirely structural** — the discriminants probe
prototype methods, `SchemaOf` infers through `ValueObject<unknown, infer SchemaType>`, `RawValueOf`
reads `prototype["value"]`, and nothing in `src/` ever touches `Class.name`. A class expression
satisfies `AnyValueObjectClass` and lands in the VO branch on its own.

## Inviolable rules

1. **Annotate every factory's return type with `ValueObjectClassOf<V, S>`.** The class is declared
   inside the function body; an inferred return type fails the declaration build with **TS4060** and
   emits no `.d.ts`.
2. **Call the factories at module scope, once.** Each call mints a fresh schema object *and* a fresh
   class. `SchemaManager` caches compiled validators by schema identity and `modelFor` memoizes by
   blueprint object, so a factory called inside `defineEntity()`/`defineMeta()`/`defineCommand()`
   recompiles per construction — silently, only slower. Corollary: two calls with identical arguments
   produce unrelated classes, so `instanceof` does not connect them.
3. **The schema and the `meta` literal live in the closure, never in the class body.** `defineMeta()`
   runs on every construction; building either inside would allocate per instance and hand
   `SchemaManager` a new cache key each time.
4. **`options` stays nested** (`{ options: { minLength: 4 } }`), never spread — TypeBox's
   `SchemaOptions` already declares a `default` field (the JSON Schema annotation), which means
   something else entirely from the demo-mode fallback.
5. **`validate` is a predicate, not a `void` hook.** It runs *after* `super.validate()`, so it only
   sees transformed, schema-valid values; returning `false` raises `InvalidPropertyException` with the
   context's `name`/`source`. Throwing from inside works too and propagates untouched.
6. **The barrel must keep `import "@roastery/terroir/schema/formats"`** — without it,
   `customStringVO({ options: { format: "slug" } })` validates against an unregistered format.
7. **A binary VO's value is a base64 `string`, never a `Uint8Array`.**
8. **Never reach for `node:buffer`.** `src/node/` is the only place in the package importing a Node
   builtin.

## Defaults

- **Ready defaults are validated eagerly, inside the factory call**, raising
  `InvalidEntityDefinitionException` (with `name` as its `source`, falling back to `"value-object"`).
  That turns a latent `demo()`/blueprint failure into a module-load failure.
- **Thunk defaults are skipped** on purpose — checking one would evaluate it, defeating the laziness —
  and the base still validates them at demo time.
- **`customObjectVO` and `unionVO` require `default`**; there is no placeholder for an arbitrary set of
  required properties, and `Value.Create` is out of reach (terroir re-exports only the root
  `@sinclair/typebox` module, not `/value`). The others fall back to `"string"` / `0` / `[]` / `{}` /
  `values[0]`, each then subject to the eager check. `customEnumVO` escapes the requirement only
  because `values[0]` always exists.

## Per-factory notes

- **`customEnumVO`** infers its literal tuple through a `const` type parameter, so the caller's array
  needs no `as const`. It builds the schema with TypeBox's own `t.Enum`, not a hand-rolled `t.Union` of
  `t.Literal`s — the record's keys (stringified values) are thrown away, since `t.Enum` only reads the
  record's *values*.
- **`optionalVO`** wraps a schema in `t.Union([schema, t.Undefined()])`. This is the only sanctioned way
  to get an `undefined`-accepting VO. Its default, when omitted, is `undefined` — not a placeholder that
  then needs validating. A blueprint property backed by one **is an omittable key** in the constructor
  payload's type (`UndefinedableKeys`).
- **`nullableVO`** wraps a schema in `t.Union([schema, t.Null()])`; default `null`. A property backed by
  one is **never** omittable — `null` doesn't extend `undefined`. Reach for `optionalVO` when a property
  may not have been provided, `nullableVO` when it was provided and is explicitly empty (the usual
  request-body vs. database-column split).
- **`unionVO`** is the general form the other two specialize, for when the alternatives are domain values
  rather than emptiness (`document: string | number`). `schemas` is a `const` type parameter bounded at
  `[t.TSchema, t.TSchema, ...t.TSchema[]]` — a union of one is that schema. Two casts in the body are
  load-bearing, each documented inline: `t.Union` takes a *mutable* array, so the readonly tuple is
  spread and restored (`[...schemas] as [...Schemas]`) or the members widen to `TSchema[]` and the return
  type stops naming the caller's schemas; and `t.Union`'s own return type is a conditional
  (`[] → TNever`, `[T] → T`, else `TUnion<T>`) TypeScript cannot reduce while `Schemas` is generic, even
  though the bound rules both degenerate branches out.
- **`customBinaryVO`** — the value is base64 because `rawOf` emits a VO's `value` as-is, so a
  `Uint8Array` would leave `JSON.stringify` as `{"type":"Buffer","data":[…]}` and `fromJSON` would
  reject it, breaking the round-trip guarantee on the very kind of property that exists to be persisted.
  The schema is `t.String` with a base64 `pattern` rather than a `format`: terroir registers
  `slug`/`url`/`uuid`/`email`/`date-time`/`simple-url` and not `base64`, and a pattern keeps the factory
  self-sufficient. `minBytes`/`maxBytes` (in `options`, typed by `IBinaryValueObjectOptions`) are checked
  against the **exact** decoded size in the generated `validate`, **not** lowered into
  `minLength`/`maxLength` — a four-character group carries one, two or three bytes, so a length-derived
  bound would admit up to two bytes past the declaration. Because the schema cannot see those bounds, the
  factory repeats the eager default check for them itself, skipping thunks for the identical reason. A
  caller's own `validate` hook is composed after the bounds, never replaced by them. This factory brings
  the pillar's only `helpers/` directory: `encodeBase64`/`decodeBase64` (public, re-exported from the
  barrel) and `base64ByteLength` (internal, direct-path import), built on the Web-standard `btoa`/`atob`.
  `encodeBase64` chunks at `0x8000` because `String.fromCharCode(...bytes)` overflows the stack on a real
  payload.

> Detail: [typescript-traps.md](../../../docs/decisions/typescript-traps.md)
> · catalog: skill `beans-collections`
