# Redaction: why `Entity.toJSON` does not redact and `Command.toJSON` does

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

`shared/redaction/` holds the sensitive-value machinery:
`configureRedaction`/`redactionConfig` (module state, **not** `globalThis`),
`sensitiveKeysOf` (per-blueprint memo, `WeakMap`-keyed like `models`), `resolveSensitiveKeys`
and `redactIfSensitive`. It is barrel-free, like `shared/helpers/`; the two public functions
and their types are re-exported from the **root** barrel instead, since redaction is a
package-wide switch rather than a pillar's concern.

## The asymmetry is the design

- `Command.toJSON()` **redacts** — never persisted; `toJSON` is what a structured logger
  reaches through `JSON.stringify`.
- `Entity.toJSON()` does **not** — persistence contract, must round-trip through `fromJSON` —
  and offers `toSafeJSON()` instead, which recurses so each nested entity applies its own keys.
- `DomainRecord` follows `Entity`'s asymmetry, not `Command`'s, and for `Entity`'s reason.
- `toString()` and the `nodejs.util.inspect.custom` hook redact on all of them.

## Two sources for *which*, two for *how*

Two sources declare *which* keys: `sensitive: true` on a value-object's `defineMeta` (travels
with the type) and `sensitive: [...]` on `defineEntity`/`defineCommand` (this aggregate only).
Only the first suppresses repository methods — see
[sensitive-suppresses-port.md](sensitive-suppresses-port.md). Both still redact, and both still
answer `Entity#isSensitive(key)`.

Two sources declare *how*, the per-class `redactWith` beating the global `placeholder`. Both
accept a ready value or a `(value, context)` function; the function receives the real value,
which is the whole reason partial masking (`a***@b.dev`) is expressible. Ready-vs-function is
discriminated by `typeof`, exactly as `meta.default` does for its thunk form, so a placeholder
that is itself a function cannot be expressed.

## A wrapper carries the inner class's declaration, not one of its own

`Wrapper.toSafeJSON` takes the container branch, and each item applies its own rules. For an
entity or record item that means recursing into its `toSafeJSON`; for a **value-object** item
there is no `toSafeJSON` to recurse into, so the wrapper reads the wrapped class's own
`defineMeta` (`metaOf`, resolved once per wrapper class) and redacts when it says
`sensitive: true`.

Without that, `arrayOf(PasswordVO)` printed its secrets through `toString()` and the inspect
hook while the same key unwrapped redacted — wrapping a class must not un-declare what the
class declares. It is also what makes the documented promise true: `arrayOf` wraps a *class*,
inheriting its `transform`, `validate` **and** `sensitive`, where `customArrayVO` wraps a
schema.

The context handed to a placeholder function is the item's, not the owner's: `name` is the
item's index (or `"value"` for a single-valued kind) and `source` is the wrapper's own
(`"array-of"`, `"optional-of"`, `"nullable-of"`) — the same identification `buildItem` puts in
an item's error context, and the same trade a nested entity already makes.

## Known limitation

An entity or record that names a **nested** record or entity in `sensitive: [...]` does not
redact it: `isSensitive` answers `true`, but `toSafeJSON` takes the recursive branch and the
sub-object applies its own keys instead. Same for a **wrapped** key: the container branch is
taken and each item applies its own rules, so naming the key adds nothing the items do not
already declare.
