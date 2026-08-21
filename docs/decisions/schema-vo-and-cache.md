# `SchemaVO`: the wire string, two-layer validation, and the hydration cache

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`SchemaVO` is the twenty-first VO in `domain/collections/` and the odd one out: its value is a
**JSON-serialized TypeBox schema** (the wire form `SchemaManager.serialize` produces), for the
case a schema is itself domain data — a CMS whose post types each declare the shape of their own
payload.

It stores the wire string rather than a live `TSchema` because a hydrated schema carries a
non-enumerable `[Kind]` symbol that `JSON.stringify` strips, so an entity holding one would not
round-trip.

## Validation is in two layers, and both are needed

`SchemaSchema`'s `"json"` format answers "does this parse", which no JSON Schema can extend to
"and does TypeBox compile it", so `validate()` asks the second question by hydrating —
`'{"type":"banana"}'` passes the first and fails the second.

`SchemaVO.match(schema, value)` checks arbitrary content against a stored schema and takes
either the VO or a raw wire string; only the string form can throw, since an instance is
compilable by class invariant, and it throws rather than answering `false` because "that is not
a schema" and "that did not match" are different answers. `SchemaVO.from(tSchema, context)` is
the producer side.

## The hydration cache is not an optimization looking for a problem

Hydration is memoized by wire string in `value-objects/helpers/schema-cache.ts`.
`SchemaManager`'s own validator cache is a `WeakMap` keyed by the schema *object*, and
`SchemaManager.build` mints a fresh one from `JSON.parse` every call, so every build misses it.
Measured here at 3.53 µs against 0.010 µs for a stable object, a factor of ~364.

`isSchemaWire` (used by `validate`) replaces `SchemaManager.isSchema`, which compiles and
discards, so constructing the VO now *warms* the cache the next `match` reads.

The cache is a `Map`, not a `WeakMap` (a string is not a GC root), and therefore carries
`MAX_CACHED_SCHEMAS = 256` with a `clear()` on overflow — a ceiling, not an LRU, because a
`SchemaVO` built from an untrusted body would otherwise grow it one entry per distinct payload.

## The optional/nullable variants

`OptionalSchemaVO`/`NullableSchemaVO` re-declare a **`validate`** hook
(`value === undefined || isSchemaWire(value)`, or the `null` twin), because `optionalVO`/
`nullableVO` wrap a *schema*, not a VO's `validate` override. That is **not** the same thing as
mirroring a sugar static: without it the variant would accept any string that parses as JSON,
which is the type's essential validation rather than a convenience. None of the sugar statics
(`SchemaVO.match/from`, `BooleanVO.truthy/falsy/from`, `DateTimeVO.now`, `UuidVO.generate`) are
mirrored — reach for `SchemaVO.match(vo.value, x)` when the key is known to be set.
